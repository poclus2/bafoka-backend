// Adresses des contrats déployés (mis à jour automatiquement)

// Réseau: hardhat
export const GOVERNANCE_ADDRESS_HARDHAT = "0x5FbDB2315678afecb367f032d93F642f64180aa3";


// Fonction utilitaire pour obtenir l'adresse selon l'environnement
export function getGovernanceAddress(network = 'hardhat') {
  switch (network.toLowerCase()) {
    case 'hardhat':
    case 'localhost':
      return GOVERNANCE_ADDRESS_HARDHAT;
    case 'alfajores':
      return GOVERNANCE_ADDRESS_ALFAJORES;
    case 'celo':
      return GOVERNANCE_ADDRESS_CELO;
    default:
      throw new Error(`Réseau non supporté: ${network}`);
  }
}

// Configuration par défaut
export const DEFAULT_NETWORK = process.env.NODE_ENV === 'production' ? 'celo' : 'hardhat';
export const DEFAULT_GOVERNANCE_ADDRESS = getGovernanceAddress(DEFAULT_NETWORK);
