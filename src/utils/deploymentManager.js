import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Gestionnaire de déploiements
 * Gère la lecture et l'écriture des informations de déploiement des contrats
 */
class DeploymentManager {
    constructor() {
        this.deploymentsPath = path.join(__dirname, '..', '..', 'deployments.json');
    }

    /**
     * Lit les informations de déploiement
     * @returns {Object} Informations de déploiement
     */
    readDeployments() {
        try {
            if (!fs.existsSync(this.deploymentsPath)) {
                return this.getDefaultDeployments();
            }

            const data = fs.readFileSync(this.deploymentsPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.warn('⚠️  Erreur lors de la lecture de deployments.json:', error.message);
            return this.getDefaultDeployments();
        }
    }

    /**
     * Écrit les informations de déploiement
     * @param {Object} deployments Informations de déploiement
     */
    writeDeployments(deployments) {
        try {
            deployments.lastUpdate = new Date().toISOString();
            fs.writeFileSync(this.deploymentsPath, JSON.stringify(deployments, null, 2));
            console.log('✅ Deployments.json mis à jour');
        } catch (error) {
            console.error('❌ Erreur lors de l\'écriture de deployments.json:', error.message);
        }
    }

    /**
     * Met à jour les informations d'un contrat
     * @param {string} contractName Nom du contrat
     * @param {Object} info Informations du contrat
     */
    updateContract(contractName, info) {
        const deployments = this.readDeployments();

        if (!deployments.contracts[contractName]) {
            deployments.contracts[contractName] = {};
        }

        deployments.contracts[contractName] = {
            ...deployments.contracts[contractName],
            ...info,
            lastUpdated: new Date().toISOString()
        };

        this.writeDeployments(deployments);
    }

    /**
     * Récupère les informations d'un contrat
     * @param {string} contractName Nom du contrat
     * @returns {Object|null} Informations du contrat
     */
    getContract(contractName) {
        const deployments = this.readDeployments();
        return deployments.contracts[contractName] || null;
    }

    /**
     * Récupère tous les contrats
     * @returns {Object} Tous les contrats
     */
    getAllContracts() {
        const deployments = this.readDeployments();
        return deployments.contracts;
    }

    /**
     * Met à jour le réseau
     * @param {string} network Nom du réseau
     */
    updateNetwork(network) {
        const deployments = this.readDeployments();
        deployments.network = network;
        this.writeDeployments(deployments);
    }

    /**
     * Retourne la structure par défaut
     * @returns {Object} Structure par défaut
     */
    getDefaultDeployments() {
        return {
            lastUpdate: null,
            network: null,
            contracts: {
                Token: {
                    address: null,
                    deploymentBlock: null,
                    deploymentTimestamp: null,
                    transactionHash: null
                },
                TokenGatedDao: {
                    address: null,
                    deploymentBlock: null,
                    deploymentTimestamp: null,
                    transactionHash: null
                },
                GovernanceDAO: {
                    address: null,
                    deploymentBlock: null,
                    deploymentTimestamp: null,
                    transactionHash: null
                }
            }
        };
    }
}

// Export d'une instance singleton
export const deploymentManager = new DeploymentManager();
export default deploymentManager;
