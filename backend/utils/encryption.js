const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Use ENCRYPTION_KEY from env, or a fallback for development.
// Hash the key using SHA-256 to guarantee it is exactly 32 bytes (256 bits).
const SECRET_KEY = crypto
  .createHash('sha256')
  .update(process.env.ENCRYPTION_KEY || 'htu_default_secret_encryption_key_2026')
  .digest();

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard IV length for GCM

/**
 * Encrypts a plaintext string to cipher text formatted as iv:tag:content
 * @param {string} text Plaintext to encrypt
 * @returns {string} Encrypted string
 */
function encrypt(text) {
  if (!text) return text;
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag().toString('hex');
    
    // Format: iv:tag:encryptedText
    return `${iv.toString('hex')}:${tag}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error.message);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypts an encrypted string formatted as iv:tag:content back to plaintext
 * @param {string} encryptedText Encrypted text to decrypt
 * @returns {string} Decrypted plaintext
 */
function decrypt(encryptedText) {
  if (!encryptedText) return encryptedText;
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      // If it doesn't match the format, return as is (could be unencrypted or old data)
      return encryptedText;
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const tag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    // If decryption fails, log it and return the original text (for dev compatibility)
    console.warn('Decryption failed, returning ciphertext as fallback');
    return encryptedText;
  }
}

module.exports = { encrypt, decrypt };
