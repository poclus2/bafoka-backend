import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './config.js';

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Token Gated DAO API',
      version: '1.0.0',
      description: `
# API Backend pour Token Gated DAO

Cette API permet de gérer les comptes, consulter les soldes, l'historique des transactions et effectuer des transferts de tokens sur le réseau Celo.

## Fonctionnalités principales

- 🔐 **Gestion des comptes** : Création et import de wallets
- 💰 **Consultation des soldes** : CELO et tokens personnalisés
- 📋 **Historique des transactions** : Suivi complet des mouvements de tokens
- 💸 **Transferts de tokens** : Envoi de tokens depuis le compte administrateur

## Réseau blockchain

- **Réseau** : Celo ${config.celoChainId === 44787 ? 'Alfajores Testnet' : 'Mainnet'}
- **Chain ID** : ${config.celoChainId}
- **RPC URL** : ${config.celoRpcUrl}

## Contrats déployés

- **Token Contract** : \`${config.tokenContractAddress}\`
- **DAO Contract** : \`${config.daoContractAddress}\`

## Sécurité

⚠️ **Important** : Ne partagez jamais vos clés privées ou phrases mnémoniques. Cette API est destinée à un usage de développement et de test.

## Support

Pour toute question ou problème, consultez le README.md ou contactez l'équipe de développement.
      `,
      contact: {
        name: 'Support API',
        email: 'support@tokengatedDAO.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: '/',
        description: 'Serveur API'
      }
    ],
    tags: [
      {
        name: 'System',
        description: 'Endpoints système (health check, informations)'
      },
      {
        name: 'Accounts',
        description: '🔐 Création et gestion de comptes (numéro de téléphone + PIN)'
      },
      {
        name: 'Balance',
        description: '💰 Consultation des soldes CELO et tokens'
      },
      {
        name: 'Transactions',
        description: '📋 Historique et détails des transactions'
      },
      {
        name: 'Transfer',
        description: '💸 Transfert de tokens'
      }
    ],
    components: {
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              example: 'Description de l\'erreur'
            },
            error: {
              type: 'string',
              example: 'Détails techniques de l\'erreur'
            }
          }
        },
        Address: {
          type: 'string',
          pattern: '^0x[a-fA-F0-9]{40}$',
          example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
        },
        Balance: {
          type: 'object',
          properties: {
            raw: {
              type: 'string',
              description: 'Valeur brute en wei',
              example: '1000000000000000000'
            },
            formatted: {
              type: 'string',
              description: 'Valeur formatée avec décimales',
              example: '1.0'
            }
          }
        },
        CeloBalance: {
          allOf: [
            { $ref: '#/components/schemas/Balance' },
            {
              type: 'object',
              properties: {
                symbol: {
                  type: 'string',
                  example: 'CELO'
                }
              }
            }
          ]
        },
        TokenBalance: {
          allOf: [
            { $ref: '#/components/schemas/Balance' },
            {
              type: 'object',
              properties: {
                symbol: {
                  type: 'string',
                  example: 'MT'
                },
                name: {
                  type: 'string',
                  example: 'MyToken'
                },
                decimals: {
                  type: 'integer',
                  example: 18
                },
                contractAddress: {
                  $ref: '#/components/schemas/Address'
                }
              }
            }
          ]
        },
        Account: {
          type: 'object',
          properties: {
            address: {
              $ref: '#/components/schemas/Address'
            },
            privateKey: {
              type: 'string',
              description: '⚠️ À garder secret !',
              example: '0x1234567890abcdef...'
            },
            mnemonic: {
              type: 'string',
              description: '⚠️ À garder secret ! (phrase de 12 ou 24 mots)',
              example: 'word1 word2 word3 ...'
            }
          }
        },
        Transaction: {
          type: 'object',
          properties: {
            hash: {
              type: 'string',
              example: '0x1234567890abcdef...'
            },
            blockNumber: {
              type: 'integer',
              example: 12345678
            },
            timestamp: {
              type: 'integer',
              description: 'Timestamp Unix',
              example: 1697097600
            },
            from: {
              $ref: '#/components/schemas/Address'
            },
            to: {
              $ref: '#/components/schemas/Address'
            },
            value: {
              $ref: '#/components/schemas/Balance'
            },
            type: {
              type: 'string',
              enum: ['sent', 'received'],
              example: 'sent'
            }
          }
        },
        NetworkInfo: {
          type: 'object',
          properties: {
            chainId: {
              type: 'integer',
              example: 44787
            },
            name: {
              type: 'string',
              example: 'alfajores'
            },
            currentBlockNumber: {
              type: 'integer',
              example: 59271067
            }
          }
        }
      },
      responses: {
        BadRequest: {
          description: 'Requête invalide',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        NotFound: {
          description: 'Ressource non trouvée',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        InternalError: {
          description: 'Erreur interne du serveur',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        ServiceUnavailable: {
          description: 'Service non disponible',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js']
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);
