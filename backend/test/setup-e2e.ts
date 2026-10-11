// Valores por defecto para las pruebas e2e. Necesitan un Postgres real:
//   docker compose up -d db   (desde la raíz del repositorio)
const defaults: Record<string, string> = {
  DB_HOST: 'localhost',
  DB_PORT: '5432',
  DB_USER: 'postgres',
  DB_PASSWORD: 'postgres',
  DB_NAME: 'encrypt_db_test',
  DB_SYNCHRONIZE: 'true',
  ENCRYPTION_KEY: '0123456789abcdef'.repeat(4),
  BLIND_INDEX_KEY: 'fedcba9876543210'.repeat(4),
  JWT_SECRET: 'e2e-secret',
  BCRYPT_ROUNDS: '4',
};

for (const [key, value] of Object.entries(defaults)) {
  process.env[key] ??= value;
}
