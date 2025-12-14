import { ethers } from 'ethers';
import { config } from '../config/config.js';
import { blockchainService } from './blockchain.service.js';

/**
 * Service de gestion automatique du gas
 * 
 * Ce service s'assure qu'aucune transaction n'échoue jamais par manque de gas.
 * Il vérifie automatiquement le solde des wallets utilisateurs et envoie du CELO
 * depuis le wallet admin si nécessaire.
 * 
 * Fonctionnalités :
 * - Vérification automatique du solde avant transaction
 * - Funding automatique si solde < seuil minimum
 * - Logs détaillés pour audit
 * - Gestion d'erreurs robuste
 */
class GasManager {
    constructor() {
        this.provider = new ethers.JsonRpcProvider(config.celoRpcUrl);
        this.minGasBalance = ethers.parseEther(config.minGasBalance.toString());

        // On garde un auto-funding confortable (0.05 CELO minimum)
        const autoFund = Math.max(config.autoGasAmount, 0.05);
        this.autoGasAmount = autoFund;

        // Statistiques pour monitoring
        this.stats = {
            totalFundings: 0,
            totalAmountFunded: 0,
            lastFunding: null
        };
    }

    /**
     * Vérifie le solde d'une adresse et finance automatiquement si nécessaire
     * @param {string} userAddress - Adresse de l'utilisateur
     * @param {string} context - Contexte de l'appel (pour les logs)
     * @returns {Promise<Object>} Résultat de la vérification/funding
     */
    async checkAndFundGas(userAddress, context = 'transaction') {
        try {
            console.log(`⛽ [GasManager] Vérification du gas pour ${userAddress} (${context})`);

            // Définir le seuil en fonction du contexte
            let currentMinBalance = this.minGasBalance;

            // Pour la création de proposition (coûteuse), on augmente le seuil
            if (context === 'create proposal') {
                currentMinBalance = ethers.parseEther('0.02');
                console.log(`   ℹ️ Contexte "create proposal": Seuil augmenté à 0.02 CELO`);
            }

            // 1. Récupérer le solde actuel
            const balance = await this.provider.getBalance(userAddress);
            const balanceInEther = ethers.formatEther(balance);

            console.log(`   💰 Solde actuel: ${balanceInEther} CELO`);
            console.log(`   📊 Seuil minimum: ${ethers.formatEther(currentMinBalance)} CELO`);

            // 2. Vérifier si le solde est suffisant
            if (balance < currentMinBalance) {
                console.log(`   ⚠️  Solde insuffisant! Auto-funding en cours...`);

                // 3. Envoyer du CELO depuis le wallet admin
                try {
                    const fundingResult = await blockchainService.sendCelo(
                        userAddress,
                        this.autoGasAmount.toString()
                    );

                    // Mise à jour des statistiques
                    this.stats.totalFundings++;
                    this.stats.totalAmountFunded += this.autoGasAmount;
                    this.stats.lastFunding = {
                        address: userAddress,
                        amount: this.autoGasAmount,
                        timestamp: new Date().toISOString(),
                        txHash: fundingResult.transactionHash
                    };

                    console.log(`   ✅ Auto-funding réussi!`);
                    console.log(`      💸 Montant: ${this.autoGasAmount} CELO`);
                    console.log(`      📝 TxHash: ${fundingResult.transactionHash}`);

                    return {
                        funded: true,
                        previousBalance: balanceInEther,
                        amountFunded: this.autoGasAmount,
                        newBalance: (parseFloat(balanceInEther) + this.autoGasAmount).toFixed(6),
                        txHash: fundingResult.transactionHash,
                        message: `Auto-funding de ${this.autoGasAmount} CELO effectué avec succès`
                    };

                } catch (fundingError) {
                    console.error(`   ❌ Échec de l'auto-funding:`, fundingError.message);

                    // Vérifier si c'est un problème de solde admin
                    if (fundingError.message.includes('insufficient funds')) {
                        throw new Error(
                            '🚨 CRITIQUE: Le wallet administrateur n\'a pas assez de fonds pour financer les transactions. ' +
                            'Veuillez recharger le wallet admin immédiatement.'
                        );
                    }

                    throw new Error(`Échec de l'auto-funding: ${fundingError.message}`);
                }
            }

            // Solde suffisant, pas de funding nécessaire
            console.log(`   ✅ Solde suffisant, pas de funding nécessaire`);
            return {
                funded: false,
                balance: balanceInEther,
                message: 'Solde suffisant'
            };

        } catch (error) {
            console.error(`❌ [GasManager] Erreur lors de la vérification du gas:`, error.message);
            throw error;
        }
    }

    /**
     * Assure qu'une adresse a suffisamment de gas pour une transaction
     * Avec retry automatique en cas d'échec
     * @param {string} userAddress - Adresse de l'utilisateur
     * @param {string} context - Contexte de l'appel
     * @param {number} maxRetries - Nombre maximum de tentatives
     * @returns {Promise<Object>} Résultat de l'opération
     */
    async ensureSufficientGas(userAddress, context = 'transaction', maxRetries = 2) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const result = await this.checkAndFundGas(userAddress, context);

                // Si funding réussi ou pas nécessaire, retourner
                return result;

            } catch (error) {
                console.error(`   ⚠️  Tentative ${attempt}/${maxRetries} échouée:`, error.message);

                // Si c'est la dernière tentative, propager l'erreur
                if (attempt === maxRetries) {
                    throw error;
                }

                // Attendre un peu avant de réessayer
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }

    /**
     * Estime le gas nécessaire pour une transaction
     * @param {Object} transaction - Objet transaction
     * @returns {Promise<bigint>} Gas estimé
     */
    async estimateGas(transaction) {
        try {
            const gasEstimate = await this.provider.estimateGas(transaction);
            return gasEstimate;
        } catch (error) {
            console.warn('⚠️  Estimation du gas échouée, utilisation de valeur par défaut');
            return BigInt(100000); // Valeur par défaut
        }
    }

    /**
     * Récupère les statistiques de funding
     * @returns {Object} Statistiques
     */
    getStats() {
        return {
            ...this.stats,
            totalAmountFundedFormatted: `${this.stats.totalAmountFunded.toFixed(4)} CELO`
        };
    }

    /**
     * Réinitialise les statistiques
     */
    resetStats() {
        this.stats = {
            totalFundings: 0,
            totalAmountFunded: 0,
            lastFunding: null
        };
        console.log('📊 Statistiques de gas manager réinitialisées');
    }

    /**
     * Vérifie si le wallet admin a suffisamment de fonds
     * @returns {Promise<Object>} État du wallet admin
     */
    async checkAdminWalletHealth() {
        try {
            if (!config.adminPrivateKey) {
                return {
                    healthy: false,
                    error: 'Wallet admin non configuré'
                };
            }

            const adminWallet = new ethers.Wallet(config.adminPrivateKey, this.provider);
            const balance = await this.provider.getBalance(adminWallet.address);
            const balanceInEther = parseFloat(ethers.formatEther(balance));

            // Considérer le wallet comme "sain" s'il a au moins 0.1 CELO
            const minHealthyBalance = 0.1;
            const healthy = balanceInEther >= minHealthyBalance;

            return {
                healthy,
                address: adminWallet.address,
                balance: balanceInEther,
                balanceFormatted: `${balanceInEther.toFixed(4)} CELO`,
                minHealthyBalance,
                warning: !healthy ? `Solde admin faible! Rechargez le wallet admin.` : null
            };

        } catch (error) {
            return {
                healthy: false,
                error: error.message
            };
        }
    }
}

// Export d'une instance singleton
export const gasManager = new GasManager();
export default gasManager;
