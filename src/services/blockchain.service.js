import { ethers } from 'ethers';
import { config } from '../config/config.js';
import { TOKEN_ABI } from '../contracts/abis.js';

class BlockchainService {
  constructor() {
    // Initialisation du provider Celo avec Network statique pour éviter les erreurs ENS
    const chainId = parseInt(config.celoChainId || '11142220');
    // On définit le réseau manuellement pour empêcher Ethers de chercher ENS sur un réseau inconnu
    const network = new ethers.Network("custom-celo", chainId);
    network.ensAddress = null; // Désactivation explicite de l'ENS

    // OPTIMISATION: batchMaxCount: 1 permet de faire du parallélisme HTTP pur
    // Cela contourne la limite "Batch of > 3 requests" qui s'applique aux array JSON-RPC
    this.provider = new ethers.JsonRpcProvider(config.celoRpcUrl, network, { staticNetwork: network, batchMaxCount: 1 });
    console.log(`📡 Provider initialisé avec ${config.celoRpcUrl} (No-Batching Mode)`);

    // MONKEY PATCH INTELLIGENT: 
    // 1. Si on demande de résoudre une adresse valide, on la retourne direct (pas d'appel ENS)
    // 2. Sinon on retourne null (pas de résolution)
    const originalResolveName = this.provider.resolveName.bind(this.provider);
    this.provider.resolveName = async (name) => {
      if (ethers.isAddress(name)) return name;
      return null;
    };

    // Désactiver le reste des fonctions ENS
    this.provider.lookupAddress = async () => null;
    this.provider.getEnsAddress = async () => null;

    // Initialisation du contrat Token avec normalisation de l'adresse (safe casing + trim + checksum)
    let rawAddress = config.tokenContractAddress ? String(config.tokenContractAddress).trim().toLowerCase() : ethers.ZeroAddress;

    // BAD ADDRESS LIST (Adresses connues pour être vides ou problématiques)
    const BAD_ADDRESSES = [
      '0xf710a9d413bed1e0c600f099081bc441106e03bd', // Empty address
      '0xf710a9d413bed1e0c600f099081bc441106e03bdd', // Typo 43 chars
      '0xac756c73c981d0f55226570fe8c8c44498d45585'  // Previous deploy (empty code)
    ];

    // RESCUE MODE: Si l'adresse est mauvaise ou vide, on force la nouvelle adresse valide déployée
    if (!rawAddress || rawAddress === ethers.ZeroAddress || BAD_ADDRESSES.includes(rawAddress) || rawAddress.length === 43) {
      console.warn(`🚨 RESCUE MODE: Adresse Token invalide '${rawAddress}' détectée. Bascule forcée sur le nouveau déploiement.`);
      rawAddress = '0xAEA24F4C64c515bd5744C9fba01BB38CcF02Ee43';
    }

    this.tokenContract = new ethers.Contract(
      ethers.getAddress(rawAddress),
      TOKEN_ABI,
      this.provider
    );


    // Wallet administrateur (si clé privée fournie)
    this.adminWallet = null;
    if (config.adminPrivateKey) {
      this.adminWallet = new ethers.Wallet(config.adminPrivateKey, this.provider);
    }
  }

  /**
   * Récupère le solde CELO (natif) d'une adresse
   */
  async getCeloBalance(address) {
    try {
      const balance = await this.provider.getBalance(address);
      return {
        raw: balance.toString(),
        formatted: ethers.formatEther(balance),
        symbol: 'CELO'
      };
    } catch (error) {
      throw new Error(`Erreur lors de la récupération du solde CELO: ${error.message}`);
    }
  }

  /**
   * Récupère le solde du token personnalisé d'une adresse
   */
  async getTokenBalance(address) {
    try {
      const balance = await this.tokenContract.balanceOf(address);
      const decimals = await this.tokenContract.decimals();
      const symbol = await this.tokenContract.symbol();
      const name = await this.tokenContract.name();

      return {
        raw: balance.toString(),
        formatted: ethers.formatUnits(balance, decimals),
        symbol: symbol,
        name: name,
        decimals: Number(decimals),
        contractAddress: config.tokenContractAddress
      };
    } catch (error) {
      throw new Error(`Erreur lors de la récupération du solde token: ${error.message}`);
    }
  }

  /**
   * Récupère les soldes CELO et Token d'une adresse
   */
  async getBalances(address) {
    try {
      const [celoBalance, tokenBalance] = await Promise.all([
        this.getCeloBalance(address),
        this.getTokenBalance(address)
      ]);

      return {
        address,
        celo: celoBalance,
        token: tokenBalance
      };
    } catch (error) {
      throw new Error(`Erreur lors de la récupération des soldes: ${error.message}`);
    }
  }

  /**
   * Récupère les transactions d'une adresse pour le token
   * Utilise les événements Transfer du contrat avec chunking pour les RPC limités
   */
  /**
   * Récupère les transactions d'une adresse pour le token (Scan inversé intelligent)
   * Scanne depuis le bloc le plus récent vers le passé pour optimiser les performances
   * et contourner les limites RPC, en s'arrêtant dès qu'on a assez de transactions.
   */
  async getTokenTransactions(address, fromBlock = 0, toBlock = 'latest', limit = 10) {
    try {
      // 1. Détermination du bloc de fin (le plus récent)
      let normalizedToBlock = toBlock;
      if (toBlock === 'latest') {
        normalizedToBlock = await this.provider.getBlockNumber();
      } else if (typeof toBlock === 'string') {
        normalizedToBlock = parseInt(toBlock, 10);
      }


      // 2. Détermination du bloc de début (le plus ancien)
      let normalizedFromBlock = fromBlock;
      if (typeof fromBlock === 'string' && fromBlock !== 'earliest') {
        normalizedFromBlock = parseInt(fromBlock, 10);
      }
      if (isNaN(normalizedFromBlock)) normalizedFromBlock = 0;

      // OPTIMISATION CRITIQUE: Ne jamais scanner avant le déploiement du contrat
      // Cela évite de scanner des millions de blocs vides pour des vieux wallets
      const deploymentBlock = config.tokenDeploymentBlock || 0;
      const scanMinBlock = Math.max(normalizedFromBlock, deploymentBlock);

      if (isNaN(normalizedToBlock)) normalizedToBlock = await this.provider.getBlockNumber();

      console.log(`🔍 Récupération des transactions de ${address}`);
      console.log(`🔍 Récupération des transactions de ${address}`);
      console.log(`📊 Strategie: Scan inversé ${normalizedToBlock} -> ${scanMinBlock} (Deployment: ${deploymentBlock})`);

      const CHUNK_SIZE = 50000; // Augmentation x10 du chunk (moins d'appels queryFilter)
      const MAX_CONCURRENT_REQUESTS = 15; // Augmentation x3 du parallélisme

      let allAttributes = [];
      let currentTo = normalizedToBlock;

      // Filtres pour les événements
      const sentFilter = this.tokenContract.filters.Transfer(address, null);
      const receivedFilter = this.tokenContract.filters.Transfer(null, address);

      // Cache de bloc local pour éviter de re-fetcher le même timestamp 10x
      const blockCache = new Map();

      // 3. Boucle de scan inversé avec BATCHING PARALLÈLE
      while (currentTo > scanMinBlock && allAttributes.length < limit) {

        // Préparer un batch de chunks à scanner en parallèle
        const batchPromises = [];
        const batchRanges = [];

        for (let i = 0; i < MAX_CONCURRENT_REQUESTS; i++) {
          if (currentTo <= scanMinBlock) break;

          const currentFrom = Math.max(scanMinBlock, currentTo - CHUNK_SIZE);
          batchRanges.push({ from: currentFrom, to: currentTo });

          const promise = Promise.all([
            this.tokenContract.queryFilter(sentFilter, currentFrom, currentTo),
            this.tokenContract.queryFilter(receivedFilter, currentFrom, currentTo)
          ]).then(([sent, received]) => ({
            from: currentFrom,
            to: currentTo,
            events: [...sent, ...received]
          })).catch(err => ({
            from: currentFrom,
            to: currentTo,
            error: err,
            events: []
          }));

          batchPromises.push(promise);
          currentTo = currentFrom - 1;
        }

        if (batchPromises.length === 0) break;

        console.log(`   ⚡ Scan ULTRA-Rapide: ${batchRanges[0].to} -> ${batchRanges[batchRanges.length - 1].from} (${batchPromises.length} chunks)`);

        try {
          const batchResults = await Promise.all(batchPromises);

          for (const res of batchResults) {
            if (res.error) continue;

            if (res.events.length > 0) {
              const decimals = await this.tokenContract.decimals();

              // PARALLÉLISME SUR LES BLOCS + CACHE
              const txPromises = res.events.map(async (event) => {
                try {
                  let block = blockCache.get(event.blockNumber);
                  if (!block) {
                    block = await event.getBlock();
                    blockCache.set(event.blockNumber, block);
                  }

                  return {
                    hash: event.transactionHash,
                    blockNumber: event.blockNumber,
                    timestamp: block.timestamp,
                    from: event.args.from,
                    to: event.args.to,
                    value: {
                      raw: event.args.value.toString(),
                      formatted: ethers.formatUnits(event.args.value, decimals)
                    },
                    type: event.args.from.toLowerCase() === address.toLowerCase() ? 'sent' : 'received'
                  };
                } catch (e) { return null; }
              });

              const chunkTransactions = (await Promise.all(txPromises)).filter(tx => tx !== null);
              allAttributes.push(...chunkTransactions);
            }
          }

        } catch (error) {
          console.warn(`⚠️ Erreur batch speed: ${error.message}`);
        }
      }

      // 4. Tri final et slice
      // On veut les plus récentes en premier
      allAttributes.sort((a, b) => b.blockNumber - a.blockNumber);

      // On garde uniquement les 'limit' premières
      const finalTransactions = allAttributes.slice(0, limit);

      console.log(`✅ ${finalTransactions.length} transactions récupérées (Scan arrêté à ${currentTo})`);

      return {
        address,
        contractAddress: config.tokenContractAddress,
        totalTransactions: finalTransactions.length, // C'est le nombre RETOURNÉ, pas total absolu sur la chaine
        transactions: finalTransactions,
        _debug: {
          strategy: 'reverse_chunk_scan',
          scannedRange: `${normalizedToBlock} -> ${currentTo}`,
          limit: limit
        }
      };

    } catch (error) {
      throw new Error(`Erreur lors de la récupération des transactions: ${error.message}`);
    }
  }

  /**
   * Récupère TOUTES les transactions d'une adresse en chunks (pour RPC limités)
   * ⚠️ Utilise cette méthode pour récupérer l'historique complet sur Sepolia
   */
  async getTokenTransactionsComplete(address, fromBlock = 0, toBlock = 'latest') {
    try {
      console.log(`🔍 Récupération complète des transactions de ${address}`);

      // Obtenir le dernier bloc
      const latestBlock = await this.provider.getBlockNumber();
      let normalizedToBlock = toBlock === 'latest' ? latestBlock : parseInt(toBlock);
      let normalizedFromBlock = parseInt(fromBlock);

      const CHUNK_SIZE = 5000; // Chunks de 5000 blocs pour être sûr
      const allTransactions = [];
      let processedChunks = 0;
      let totalChunks = Math.ceil((normalizedToBlock - normalizedFromBlock) / CHUNK_SIZE);

      console.log(`📊 Range totale: ${normalizedFromBlock} -> ${normalizedToBlock} (${normalizedToBlock - normalizedFromBlock} blocs)`);
      console.log(`🔢 Sera divisé en ${totalChunks} chunks de ${CHUNK_SIZE} blocs`);

      // Filtres pour les événements Transfer
      const sentFilter = this.tokenContract.filters.Transfer(address, null);
      const receivedFilter = this.tokenContract.filters.Transfer(null, address);

      // Traitement par chunks
      for (let currentFrom = normalizedFromBlock; currentFrom < normalizedToBlock; currentFrom += CHUNK_SIZE) {
        const currentTo = Math.min(currentFrom + CHUNK_SIZE - 1, normalizedToBlock);
        processedChunks++;

        console.log(`🔄 Chunk ${processedChunks}/${totalChunks}: blocs ${currentFrom} -> ${currentTo}`);

        try {
          // Récupération des événements pour ce chunk
          const [sentEvents, receivedEvents] = await Promise.all([
            this.tokenContract.queryFilter(sentFilter, currentFrom, currentTo),
            this.tokenContract.queryFilter(receivedFilter, currentFrom, currentTo)
          ]);

          const chunkEvents = [...sentEvents, ...receivedEvents];
          console.log(`   📝 ${chunkEvents.length} événements trouvés dans ce chunk`);

          // Traitement des événements de ce chunk
          const chunkTransactions = await Promise.all(
            chunkEvents.map(async (event) => {
              const block = await event.getBlock();
              const decimals = await this.tokenContract.decimals();

              return {
                hash: event.transactionHash,
                blockNumber: event.blockNumber,
                timestamp: block.timestamp,
                from: event.args.from,
                to: event.args.to,
                value: {
                  raw: event.args.value.toString(),
                  formatted: ethers.formatUnits(event.args.value, decimals)
                },
                type: event.args.from.toLowerCase() === address.toLowerCase() ? 'sent' : 'received'
              };
            })
          );

          allTransactions.push(...chunkTransactions);

          // Petit délai pour éviter de surcharger le RPC
          if (processedChunks < totalChunks) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }

        } catch (chunkError) {
          console.error(`❌ Erreur dans le chunk ${processedChunks}: ${chunkError.message}`);
          // Continue avec le chunk suivant plutôt que d'échouer complètement
        }
      }

      // Tri par numéro de bloc décroissant (plus récent en premier)
      allTransactions.sort((a, b) => b.blockNumber - a.blockNumber);

      console.log(`✅ Récupération complète terminée: ${allTransactions.length} transactions au total`);

      return {
        address,
        contractAddress: config.tokenContractAddress,
        totalTransactions: allTransactions.length,
        transactions: allTransactions,
        _info: {
          method: 'chunked',
          chunksProcessed: processedChunks,
          chunkSize: CHUNK_SIZE,
          totalBlocks: normalizedToBlock - normalizedFromBlock
        }
      };

    } catch (error) {
      throw new Error(`Erreur lors de la récupération complète des transactions: ${error.message}`);
    }
  }

  /**
   * Transfère des tokens depuis le compte administrateur
   */
  async transferTokens(toAddress, amount) {
    try {
      if (!this.adminWallet) {
        throw new Error('Clé privée administrateur non configurée');
      }

      // Vérification de l'adresse de destination
      if (!ethers.isAddress(toAddress)) {
        throw new Error('Adresse de destination invalide');
      }

      // Connexion du contrat avec le wallet admin
      const tokenWithSigner = this.tokenContract.connect(this.adminWallet);
      const decimals = await tokenWithSigner.decimals();

      // Conversion du montant en wei
      const amountInWei = ethers.parseUnits(amount.toString(), decimals);

      // Vérification du solde
      const adminBalance = await tokenWithSigner.balanceOf(this.adminWallet.address);
      if (adminBalance < amountInWei) {
        throw new Error('Solde administrateur insuffisant');
      }

      // Exécution du transfert
      const checksumAddress = ethers.getAddress(toAddress);
      const tx = await tokenWithSigner.transfer(checksumAddress, amountInWei);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        from: this.adminWallet.address,
        to: toAddress,
        amount: {
          raw: amountInWei.toString(),
          formatted: amount.toString()
        },
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      throw new Error(`Erreur lors du transfert de tokens: ${error.message}`);
    }
  }

  /**
   * Génère de nouveaux tokens (Mint) - Admin uniquement
   * @param {string} toAddress - Adresse destinataire
   * @param {string} amount - Montant à générer
   */
  async mintTokens(toAddress, amount) {
    try {
      if (!this.adminWallet) {
        throw new Error('Clé privée administrateur non configurée');
      }

      // Forcer le format Checksum Address pour éviter qu'Ethers ne pense que c'est un nom ENS
      const checksumAddress = ethers.getAddress(toAddress);

      const tokenWithSigner = this.tokenContract.connect(this.adminWallet);
      const decimals = await tokenWithSigner.decimals();
      const amountInWei = ethers.parseUnits(amount.toString(), decimals);

      console.log(`🔨 Mint de ${amount} tokens vers ${checksumAddress}...`);

      const tx = await tokenWithSigner.mint(checksumAddress, amountInWei);
      const receipt = await tx.wait();

      console.log(`✅ Mint confirmé dans le bloc ${receipt.blockNumber}`);

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        to: toAddress,
        amount: {
          raw: amountInWei.toString(),
          formatted: amount.toString()
        }
      };
    } catch (error) {
      throw new Error(`Erreur lors du mint de tokens: ${error.message}`);
    }
  }

  /**
   * Envoie du CELO natif à une adresse
   * @param {string} toAddress - Adresse destinataire
   * @param {string} amount - Montant en CELO (ex: "0.1")
   * @returns {Promise<Object>} - Transaction hash et détails
   */
  async sendCelo(toAddress, amount) {
    try {
      if (!this.adminWallet) {
        throw new Error('Wallet administrateur non configuré. Vérifiez ADMIN_PRIVATE_KEY dans .env');
      }

      // Validation de l'adresse
      if (!ethers.isAddress(toAddress)) {
        throw new Error('Adresse destinataire invalide');
      }

      // Conversion du montant en Wei
      const amountInWei = ethers.parseEther(amount.toString());

      // Vérification du solde du wallet admin
      const adminBalance = await this.provider.getBalance(this.adminWallet.address);
      if (adminBalance < amountInWei) {
        throw new Error(`Solde insuffisant du wallet administrateur. Solde: ${ethers.formatEther(adminBalance)} CELO`);
      }

      console.log(`💸 Envoi de ${amount} CELO à ${toAddress}...`);

      const checksumAddress = ethers.getAddress(toAddress);

      // Création et envoi de la transaction
      const tx = await this.adminWallet.sendTransaction({
        to: checksumAddress,
        value: amountInWei
      });

      console.log(`⏳ Transaction envoyée. Hash: ${tx.hash}`);

      // Attente de la confirmation
      const receipt = await tx.wait();

      console.log(`✅ Transaction confirmée dans le bloc ${receipt.blockNumber}`);

      return {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        from: receipt.from,
        to: receipt.to,
        amount: amount,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 1 ? 'success' : 'failed'
      };
    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi de CELO:', error);
      throw new Error(`Erreur lors de l'envoi de CELO: ${error.message}`);
    }
  }

  /**
   * Vérifie si une adresse est valide
   */
  isValidAddress(address) {
    return ethers.isAddress(address);
  }

  /**
   * Récupère le nombre de transactions d'une adresse
   * Utilise l'historique des transferts de tokens pour refléter l'activité réelle dans la DAO
   */
  async getTransactionCount(address) {
    try {
      // On récupère l'historique des tokens car c'est ce qui importe pour la DAO
      // Cela inclut les envois et les réceptions
      const tokenTx = await this.getTokenTransactions(address);
      return tokenTx.totalTransactions;
    } catch (error) {
      console.warn(`⚠️ Erreur lors du comptage des transactions token: ${error.message}`);
      // Fallback sur le nonce natif (transactions envoyées uniquement)
      return await this.provider.getTransactionCount(address);
    }
  }

  /**
   * Récupère les informations de base du compte
   */
  async getAccountInfo(address) {
    try {
      // On récupère l'historique pour avoir le count ET la première transaction
      const tokenTx = await this.getTokenTransactions(address);
      const balance = await this.provider.getBalance(address);

      let firstTransaction = null;
      if (tokenTx.transactions && tokenTx.transactions.length > 0) {
        // Les transactions sont triées par ordre décroissant (plus récente en premier)
        // Donc la dernière est la plus ancienne
        const oldestTx = tokenTx.transactions[tokenTx.transactions.length - 1];
        // Le timestamp est en secondes, on convertit en ms
        firstTransaction = oldestTx.timestamp * 1000;
      }

      return {
        address,
        transactionCount: tokenTx.totalTransactions,
        balance: ethers.formatEther(balance),
        firstTransaction: firstTransaction
      };
    } catch (error) {
      throw new Error(`Erreur lors de la récupération des infos du compte: ${error.message}`);
    }
  }

  /**
   * Récupère les informations du réseau
   */
  async getNetworkInfo() {
    try {
      const network = await this.provider.getNetwork();
      const blockNumber = await this.provider.getBlockNumber();

      return {
        chainId: Number(network.chainId),
        name: network.name,
        currentBlockNumber: blockNumber
      };
    } catch (error) {
      throw new Error(`Erreur lors de la récupération des informations réseau: ${error.message}`);
    }
  }

  /**
   * Effectue un transfert de tokens en utilisant le système phone/PIN pour signer
   * @param {string} fromPhoneNumber - Numéro de téléphone de l'expéditeur
   * @param {string} fromPin - PIN de l'expéditeur
   * @param {string} toAddress - Adresse du destinataire
   * @param {string} amount - Montant à transférer (en tokens, pas en wei)
   * @returns {Object} Résultat de la transaction
   */
  async transferTokenWithPhoneAuth(fromPhoneNumber, fromPin, toAddress, amount) {
    try {
      console.log(`💸 Début du transfert: ${amount} tokens vers ${toAddress}`);

      // Import du service phone wallet
      const { phoneWalletService } = await import('./phoneWallet.service.js');

      // 1. Générer le wallet de l'expéditeur à partir de son téléphone/PIN
      const senderWalletResult = phoneWalletService.createOrGetWalletFromPhone(fromPhoneNumber, fromPin);
      const senderAddress = senderWalletResult.wallet.address;

      console.log(`👤 Expéditeur: ${senderAddress}`);

      // 2. Valider l'adresse du destinataire
      if (!this.isValidAddress(toAddress)) {
        throw new Error('Adresse de destinataire invalide');
      }

      // 3. Valider le montant
      if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
        throw new Error('Montant invalide');
      }

      // 4. Vérifier le solde de l'expéditeur
      const senderBalance = await this.getTokenBalance(senderAddress);
      const transferAmount = parseFloat(amount);

      if (parseFloat(senderBalance.formatted) < transferAmount) {
        throw new Error(`Solde insuffisant. Balance: ${senderBalance.formatted} tokens, demandé: ${transferAmount} tokens`);
      }

      // 5. Créer le wallet avec la clé privée pour signer
      const privateKey = phoneWalletService.derivePrivateKeyFromPhone(fromPhoneNumber, fromPin);
      const senderWallet = new ethers.Wallet(privateKey, this.provider);

      // 6. Se connecter au contrat token (utilisation de l'adresse validée/rescuée du service)
      const tokenContract = new ethers.Contract(this.tokenContract.target, TOKEN_ABI, senderWallet);

      // 7. Convertir le montant en wei (18 decimals pour les tokens ERC20 standard)
      const amountInWei = ethers.parseUnits(amount.toString(), 18);

      // 8. Estimer le gas nécessaire
      let gasEstimate;
      try {
        gasEstimate = await tokenContract.transfer.estimateGas(toAddress, amountInWei);
        console.log(`⛽ Gas estimé: ${gasEstimate.toString()}`);
      } catch (estimateError) {
        console.warn('⚠️ Estimation du gas échouée, utilisation de valeur par défaut');
        gasEstimate = BigInt(100000); // Valeur par défaut
      }

      // 9. Préparer la transaction avec les paramètres appropriés selon le réseau
      const network = await this.provider.getNetwork();
      let txParams = {
        gasLimit: gasEstimate + BigInt(20000), // Ajouter une marge
      };

      // Configuration spécifique selon le réseau
      if (Number(network.chainId) === 11155111) { // Sepolia
        txParams.gasPrice = ethers.parseUnits('20', 'gwei');
      } else if (Number(network.chainId) === 44787) { // Alfajores
        txParams.gasPrice = ethers.parseUnits('2', 'gwei');
      }

      console.log(`🚀 Envoi de la transaction...`);

      // 10. Exécuter le transfert
      const tx = await tokenContract.transfer(toAddress, amountInWei, txParams);

      console.log(`📝 Transaction envoyée: ${tx.hash}`);
      console.log(`⏳ Attente de confirmation...`);

      // 11. Attendre la confirmation
      const receipt = await tx.wait();

      if (receipt.status !== 1) {
        throw new Error('Transaction échouée lors de l\'exécution');
      }

      console.log(`✅ Transaction confirmée dans le bloc ${receipt.blockNumber}`);

      // 12. Retourner les détails de la transaction
      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        from: senderAddress,
        to: toAddress,
        amount: amount,
        amountInWei: amountInWei.toString(),
        gasUsed: receipt.gasUsed.toString(),
        gasPrice: txParams.gasPrice ? txParams.gasPrice.toString() : 'N/A',
        status: 'confirmed',
        networkUsed: network.name,
        chainId: Number(network.chainId),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Erreur lors du transfert de tokens:', error);
      throw new Error(`Erreur lors du transfert: ${error.message}`);
    }
  }
}

// Export d'une instance singleton
export const blockchainService = new BlockchainService();
