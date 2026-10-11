import { ConfigService } from '@nestjs/config';
import { EncryptionService } from './encryption.service';

const buildService = (overrides: Record<string, string> = {}) => {
  const values: Record<string, string> = {
    ENCRYPTION_KEY: 'a'.repeat(64),
    BLIND_INDEX_KEY: 'b'.repeat(64),
    ...overrides,
  };
  const config = { getOrThrow: (key: string) => values[key] } as unknown as ConfigService;
  return new EncryptionService(config);
};

describe('EncryptionService', () => {
  const service = buildService();

  it('cifra y descifra devolviendo el texto original', () => {
    const plain = 'Juan Pérez ñandú 🚀';
    const encrypted = service.encrypt(plain);

    expect(encrypted).not.toContain(plain);
    expect(service.decrypt(encrypted)).toBe(plain);
  });

  it('usa el formato v1:iv:tag:ciphertext con IV de 12 bytes y tag de 16 bytes', () => {
    const [version, iv, tag, cipherText] = service.encrypt('hola').split(':');

    expect(version).toBe('v1');
    expect(Buffer.from(iv, 'base64')).toHaveLength(12);
    expect(Buffer.from(tag, 'base64')).toHaveLength(16);
    expect(Buffer.from(cipherText, 'base64')).toHaveLength(4);
  });

  it('genera un texto cifrado distinto cada vez (IV aleatorio)', () => {
    expect(service.encrypt('mismo valor')).not.toBe(service.encrypt('mismo valor'));
  });

  it('rechaza un texto cifrado manipulado (autenticación GCM)', () => {
    const [version, iv, tag, cipherText] = service.encrypt('dato sensible').split(':');
    const tampered = Buffer.from(cipherText, 'base64');
    tampered[0] ^= 0xff;

    expect(() => service.decrypt([version, iv, tag, tampered.toString('base64')].join(':'))).toThrow();
  });

  it('no puede descifrar con otra clave', () => {
    const other = buildService({ ENCRYPTION_KEY: 'c'.repeat(64) });
    expect(() => other.decrypt(service.encrypt('secreto'))).toThrow();
  });

  it('rechaza formatos no válidos', () => {
    expect(() => service.decrypt('texto-plano')).toThrow('Formato de texto cifrado no válido');
  });

  it('blindIndex es determinista, normaliza y no revela el valor', () => {
    const hash = service.blindIndex('  User@Example.com ');

    expect(hash).toBe(service.blindIndex('user@example.com'));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain('user');
  });

  it('falla si la clave no tiene 32 bytes', () => {
    expect(() => buildService({ ENCRYPTION_KEY: 'abcd' })).toThrow(/32 bytes/);
  });
});
