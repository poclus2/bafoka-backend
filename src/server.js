console.log('🐞 DEBUG: server.js loading...');
import app from './app.js';
import { config, validateConfig } from './config/config.js';
import { blockchainService } from './services/blockchain.service.js';

// Validation de la configuration
validateConfig();

// Démarrage du serveur
const startServer = async () => {
  // Démarrage du serveur HTTP (NON-BLOQUANT)
  const server = app.listen(config.port, async () => {
    console.log('\n🚀 Serveur démarré avec succès!');
    console.log(`📡 API disponible sur: http://localhost:${config.port}`);
    console.log(`📖 Documentation API: http://localhost:${config.port}/api`);
    console.log(`📚 Documentation Swagger: http://localhost:${config.port}/api-docs`);
    console.log(`🏥 Health check: http://localhost:${config.port}/api/health`);
    console.log(`🌍 Environnement: ${config.nodeEnv}`);

    // Tentative de connexion blockchain en arrière-plan
    try {
      console.log('\n🔗 Tentative de connexion au réseau Celo...');
      const networkInfo = await blockchainService.getNetworkInfo();
      console.log('✅ Connecté au réseau:', networkInfo.name);
      console.log('📊 Chain ID:', networkInfo.chainId);
      console.log('🔢 Bloc actuel:', networkInfo.currentBlockNumber);

      // Informations sur les contrats
      console.log('\n📜 Contrats configurés:');
      console.log('   Token:', config.tokenContractAddress);
      console.log('   DAO:', config.daoContractAddress);
    } catch (bcError) {
      console.warn('\n⚠️  ATTENTION: Impossible de se connecter à la blockchain au démarrage');
      console.warn('   Erreur:', bcError.message);
      console.warn('   Le serveur reste actif mais les fonctionnalités blockchain peuvent échouer.\n');
    }

    if (!config.adminPrivateKey) {
      console.log('\n⚠️  ATTENTION: Clé privée administrateur non configurée');
      console.log('   Les fonctionnalités de transfert ne seront pas disponibles.');
      console.log('   Ajoutez ADMIN_PRIVATE_KEY dans votre fichier .env');
    }

    console.log('\n✨ Le backend est prêt à recevoir des requêtes!');
  });

};

// Gestion des erreurs non capturées
process.on('unhandledRejection', (err) => {
  console.error('❌ Erreur non gérée:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Exception non capturée:', err);
  process.exit(1);
});

// Gestion de l'arrêt gracieux
process.on('SIGTERM', () => {
  console.log('🛑 Signal SIGTERM reçu, arrêt gracieux...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Signal SIGINT reçu, arrêt gracieux...');
  process.exit(0);
});

// Démarrage
startServer();
