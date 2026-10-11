import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Tamaño recomendado de IV para GCM
const VERSION = 'v1';

/**
 * Cifrado reversible (AES-256-GCM) para los datos personales y
 * blind index (HMAC-SHA256, de una sola vía) para poder buscar por email
 * sin guardarlo en claro.
 *
 * Formato del texto cifrado: `v1:<iv base64>:<authTag base64>:<ciphertext base64>`
 */
@Injectable()
export class EncryptionService {
  private readonly encryptionKey: Buffer;
  private readonly blindIndexKey: Buffer;

  constructor(config: ConfigService) {
    this.encryptionKey = Buffer.from(config.getOrThrow<string>('ENCRYPTION_KEY'), 'hex');
    this.blindIndexKey = Buffer.from(config.getOrThrow<string>('BLIND_INDEX_KEY'), 'hex');
    if (this.encryptionKey.length !== 32 || this.blindIndexKey.length !== 32) {
      throw new Error('Las claves de cifrado deben tener 32 bytes');
    }
  }

  encrypt(plainText: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.encryptionKey, iv);
    const cipherText = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return [VERSION, ...[iv, authTag, cipherText].map((part) => part.toString('base64'))].join(':');
  }

  decrypt(payload: string): string {
    const [version, iv, authTag, cipherText] = payload.split(':');
    if (version !== VERSION || !iv || !authTag || cipherText === undefined) {
      throw new Error('Formato de texto cifrado no válido');
    }
    const decipher = createDecipheriv(ALGORITHM, this.encryptionKey, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(authTag, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(cipherText, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  }

  /** Hash determinista para búsquedas por igualdad (no se puede revertir). */
  blindIndex(value: string): string {
    return createHmac('sha256', this.blindIndexKey).update(value.trim().toLowerCase()).digest('hex');
  }
}
