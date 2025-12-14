import { ethers } from 'ethers';
import crypto from 'crypto';
import { parsePhoneNumberWithError } from 'libphonenumber-js';
import { config } from '../config/config.js';

/**
 * Service de gestion des wallets basés sur les numéros de téléphone
 * Utilise la dérivation déterministe pour créer des wallets reproductibles
 */
class PhoneWalletService {
  constructor() {
    this.secret = config.walletDerivationSecret;
  }

  /**
   * Normalise un numéro de téléphone au format international
   * @param {string} phoneNumber - Numéro de téléphone (avec ou sans indicatif)
   * @param {string} defaultCountry - Code pays par défaut (ex: 'FR', 'US')
   * @returns {string} Numéro normalisé au format E.164 (ex: +33612345678)
   */
  normalizePhoneNumber(phoneNumber, defaultCountry = 'FR') {
    try {
      // Supprime tous les espaces et caractères spéciaux
      let cleaned = phoneNumber.replace(/[\s\-\(\)\.]/g, '');

      // Si le numéro ne commence pas par +, essaie de le parser avec le pays par défaut
      if (!cleaned.startsWith('+')) {
        const parsed = parsePhoneNumberWithError(cleaned, defaultCountry);
        if (parsed && parsed.isValid()) {
          return parsed.number; // Format E.164
        }
      } else {
        // Vérifie si le numéro avec + est valide
        const parsed = parsePhoneNumberWithError(cleaned);
        if (parsed && parsed.isValid()) {
          return parsed.number;
        }
      }

      // Si le parsing échoue, utilise le numéro nettoyé tel quel
      return cleaned;
    } catch (error) {
      // En cas d'erreur, retourne le numéro nettoyé
      return phoneNumber.replace(/[\s\-\(\)\.]/g, '');
    }
  }

  /**
   * Valide un code PIN
   * @param {string} pin - Code PIN à valider
   * @returns {Object} Résultat de la validation
   */
  validatePIN(pin) {
    if (!pin || typeof pin !== 'string') {
      return {
        isValid: false,
        error: 'Le PIN est requis'
      };
    }

    // Vérifie que le PIN ne contient que des chiffres
    if (!/^\d+$/.test(pin)) {
      return {
        isValid: false,
        error: 'Le PIN doit contenir uniquement des chiffres'
      };
    }

    // Vérifie la longueur (4-8 chiffres)
    if (pin.length < 4 || pin.length > 8) {
      return {
        isValid: false,
        error: 'Le PIN doit contenir entre 4 et 8 chiffres'
      };
    }

    return {
      isValid: true
    };
  }

  /**
   * Dérive une clé privée de manière déterministe à partir d'un numéro de téléphone
   * @param {string} phoneNumber - Numéro de téléphone
   * @param {string} pin - PIN OBLIGATOIRE (4-8 chiffres)
   * @param {number} iterations - Nombre d'itérations pour le hashing (défaut: 100000)
   * @returns {string} Clé privée (32 bytes en hexadécimal)
   */
  derivePrivateKeyFromPhone(phoneNumber, pin, iterations = 100000) {
    try {
      // Valide le PIN (maintenant obligatoire)
      const pinValidation = this.validatePIN(pin);
      if (!pinValidation.isValid) {
        throw new Error(pinValidation.error);
      }

      // Normalise le numéro de téléphone
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

      // Combine le numéro de téléphone et le PIN
      const input = `${normalizedPhone}:${pin}`;

      // Utilise PBKDF2 pour dériver une clé de manière sécurisée
      // PBKDF2 (Password-Based Key Derivation Function 2) est un algorithme de dérivation
      // qui applique une fonction de hachage multiple fois pour ralentir les attaques par force brute
      // LE SALT SERVEUR EST UTILISÉ ICI (this.secret) ↓
      const derivedKey = crypto.pbkdf2Sync(
        input,                    // Données d'entrée (numéro + PIN)
        this.secret,              // Salt serveur secret (de .env)
        iterations,               // Nombre d'itérations
        32,                       // Longueur de la clé en bytes (256 bits)
        'sha256'                  // Algorithme de hachage
      );

      // Convertit en format hexadécimal avec préfixe 0x
      return '0x' + derivedKey.toString('hex');
    } catch (error) {
      throw new Error(`Erreur lors de la dérivation de la clé: ${error.message}`);
    }
  }

  /**
   * Crée ou récupère un wallet à partir d'un numéro de téléphone
   * @param {string} phoneNumber - Numéro de téléphone
   * @param {string} pin - PIN OBLIGATOIRE (4-8 chiffres)
   * @returns {Object} Informations du wallet
   */
  createOrGetWalletFromPhone(phoneNumber, pin) {
    try {
      // Valide le numéro de téléphone
      if (!phoneNumber || phoneNumber.trim() === '') {
        throw new Error('Numéro de téléphone requis');
      }

      // Valide le PIN (maintenant obligatoire)
      const pinValidation = this.validatePIN(pin);
      if (!pinValidation.isValid) {
        throw new Error(pinValidation.error);
      }

      // Normalise le numéro
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

      // Dérive la clé privée
      const privateKey = this.derivePrivateKeyFromPhone(normalizedPhone, pin);

      // Crée le wallet à partir de la clé privée
      const wallet = new ethers.Wallet(privateKey);

      return {
        success: true,
        wallet: {
          address: wallet.address,
          phoneNumber: normalizedPhone
        },
        message: '✅ Wallet créé avec succès ! Utilisez cette adresse pour toutes vos transactions.',
        info: 'Conservez précieusement votre numéro de téléphone et votre PIN. Ils vous permettront de signer des transactions.'
      };
    } catch (error) {
      throw new Error(`Erreur lors de la création du wallet: ${error.message}`);
    }
  }

  /**
   * Vérifie l'accès à un wallet en testant le numéro de téléphone et le PIN
   * @param {string} phoneNumber - Numéro de téléphone
   * @param {string} pin - PIN (4-8 chiffres)
   * @param {string} expectedAddress - Adresse attendue pour vérification
   * @returns {boolean} True si les credentials sont corrects
   */
  verifyWalletAccess(phoneNumber, pin, expectedAddress) {
    try {
      const result = this.createOrGetWalletFromPhone(phoneNumber, pin);
      return result.wallet.address.toLowerCase() === expectedAddress.toLowerCase();
    } catch (error) {
      return false;
    }
  }

  /**
   * Convertit un numéro de téléphone en adresse wallet
   * @param {string} phoneNumber - Numéro de téléphone
   * @param {string} pin - PIN (4-8 chiffres)
   * @returns {string} Adresse du wallet
   */
  phoneToAddress(phoneNumber, pin) {
    const result = this.createOrGetWalletFromPhone(phoneNumber, pin);
    return result.wallet.address;
  }

  /**
   * Génère un hash du numéro de téléphone pour stockage anonyme
   * Utile si vous voulez stocker une référence au numéro sans le stocker en clair
   * @param {string} phoneNumber - Numéro de téléphone
   * @returns {string} Hash SHA256 du numéro (avec salt serveur)
   */
  hashPhoneNumber(phoneNumber) {
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
    return crypto
      .createHash('sha256')
      .update(normalizedPhone + this.secret)  // ← Utilise le salt serveur
      .digest('hex');
  }

  /**
   * Valide un numéro de téléphone
   * @param {string} phoneNumber - Numéro de téléphone
   * @param {string} defaultCountry - Code pays par défaut
   * @returns {Object} Résultat de la validation
   */
  validatePhoneNumber(phoneNumber, defaultCountry = 'FR') {
    try {
      const cleaned = phoneNumber.replace(/[\s\-\(\)\.]/g, '');
      
      let parsed;
      if (!cleaned.startsWith('+')) {
        parsed = parsePhoneNumberWithError(cleaned, defaultCountry);
      } else {
        parsed = parsePhoneNumberWithError(cleaned);
      }

      if (!parsed) {
        return {
          isValid: false,
          error: 'Format de numéro invalide'
        };
      }

      return {
        isValid: parsed.isValid(),
        formatted: parsed.isValid() ? parsed.number : null,
        country: parsed.country || null,
        nationalNumber: parsed.nationalNumber || null,
        type: parsed.getType() || null
      };
    } catch (error) {
      return {
        isValid: false,
        error: error.message
      };
    }
  }
}

// Export d'une instance singleton
export const phoneWalletService = new PhoneWalletService();
