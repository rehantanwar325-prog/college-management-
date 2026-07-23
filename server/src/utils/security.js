import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const ALGORITHM = 'aes-256-cbc';
// Key must be exactly 32 bytes (256 bits)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p'; 
const IV_LENGTH = 16;

export function encrypt(text) {
  if (!text) return '';
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (error) {
    console.error('Encryption error:', error);
    return text;
  }
}

export function decrypt(text) {
  if (!text) return '';
  try {
    if (typeof text !== 'string' || !text.includes(':')) return text;
    const textParts = text.split(':');
    const ivHex = textParts.shift();
    const encryptedHex = textParts.join(':');
    
    if (!ivHex || ivHex.length !== IV_LENGTH * 2) return text;
    
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedText = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Decryption fallback handled:', error.message);
    return text;
  }
}
