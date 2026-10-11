import { validateEnv } from './env.validation';

const validEnv = {
  DB_HOST: 'localhost',
  DB_USER: 'postgres',
  DB_PASSWORD: 'postgres',
  DB_NAME: 'encrypt_db',
  ENCRYPTION_KEY: 'a'.repeat(64),
  BLIND_INDEX_KEY: 'b'.repeat(64),
  JWT_SECRET: 'secret',
};

describe('validateEnv', () => {
  it('acepta una configuración válida', () => {
    expect(validateEnv(validEnv)).toEqual(validEnv);
  });

  it('falla si falta una variable requerida', () => {
    const { JWT_SECRET: _omit, ...env } = validEnv;
    expect(() => validateEnv(env)).toThrow(/JWT_SECRET/);
  });

  it('falla si la clave de cifrado no tiene 32 bytes en hex', () => {
    expect(() => validateEnv({ ...validEnv, ENCRYPTION_KEY: 'corta' })).toThrow(/ENCRYPTION_KEY/);
  });

  it('falla si ambas claves son iguales', () => {
    expect(() => validateEnv({ ...validEnv, BLIND_INDEX_KEY: validEnv.ENCRYPTION_KEY })).toThrow(
      /distintas/,
    );
  });
});
