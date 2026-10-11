const HEX_32_BYTES = /^[0-9a-fA-F]{64}$/;

const REQUIRED = [
  'DB_HOST',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'ENCRYPTION_KEY',
  'BLIND_INDEX_KEY',
  'JWT_SECRET',
] as const;

/**
 * Valida las variables de entorno al arrancar para fallar pronto si falta
 * alguna clave o si las claves criptográficas no tienen 32 bytes.
 */
export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const missing = REQUIRED.filter((key) => !config[key]);
  if (missing.length > 0) {
    throw new Error(`Faltan variables de entorno: ${missing.join(', ')}`);
  }

  for (const key of ['ENCRYPTION_KEY', 'BLIND_INDEX_KEY'] as const) {
    if (!HEX_32_BYTES.test(String(config[key]))) {
      throw new Error(`${key} debe ser una cadena hexadecimal de 64 caracteres (32 bytes)`);
    }
  }

  if (config.ENCRYPTION_KEY === config.BLIND_INDEX_KEY) {
    throw new Error('ENCRYPTION_KEY y BLIND_INDEX_KEY deben ser distintas');
  }

  return config;
}
