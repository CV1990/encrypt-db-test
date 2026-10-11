import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  const account = {
    fullName: 'María Fernández',
    email: 'Maria.Fernandez@Example.com',
    password: 'Secreta123',
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    dataSource = app.get(DataSource);
    await dataSource.query('TRUNCATE TABLE users');
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health responde ok', () => {
    return request(app.getHttpServer()).get('/api/health').expect(200, { status: 'ok' });
  });

  describe('POST /api/auth/register', () => {
    it('registra la cuenta y devuelve los datos sin la contraseña', async () => {
      const res = await request(app.getHttpServer()).post('/api/auth/register').send(account).expect(201);

      expect(res.body).toMatchObject({
        id: expect.any(String),
        fullName: account.fullName,
        email: account.email.toLowerCase(),
      });
      expect(res.body).not.toHaveProperty('password');
      expect(res.body).not.toHaveProperty('passwordHash');
    });

    it('guarda en Postgres solo datos cifrados / con hash', async () => {
      const [row] = await dataSource.query(
        'SELECT email_hash, email_encrypted, full_name_encrypted, password_hash FROM users',
      );
      const rowText = JSON.stringify(row).toLowerCase();

      expect(rowText).not.toContain(account.email.toLowerCase());
      expect(rowText).not.toContain('maría');
      expect(rowText).not.toContain(account.password.toLowerCase());
      expect(row.email_hash).toMatch(/^[0-9a-f]{64}$/);
      expect(row.email_encrypted).toMatch(/^v1:/);
      expect(row.full_name_encrypted).toMatch(/^v1:/);
      expect(row.password_hash).toMatch(/^\$2[aby]\$/);
    });

    it('rechaza un correo duplicado (sin importar mayúsculas) con 409', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ ...account, email: account.email.toUpperCase() })
        .expect(409);
    });

    it('rechaza datos inválidos con 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ fullName: '', email: 'no-es-email', password: 'corta' })
        .expect(400);

      expect(res.body.message).toEqual(
        expect.arrayContaining(['El correo no es válido', 'La contraseña debe tener al menos 8 caracteres']),
      );
    });

    it('rechaza campos no permitidos con 400', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ ...account, email: 'otro@example.com', isAdmin: true })
        .expect(400);
    });
  });

  describe('POST /api/auth/login + GET /api/auth/me', () => {
    let token: string;

    it('autentica con credenciales correctas', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: account.email, password: account.password })
        .expect(200);

      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.user.email).toBe(account.email.toLowerCase());
      token = res.body.accessToken;
    });

    it('rechaza una contraseña incorrecta con 401', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: account.email, password: 'Incorrecta1' })
        .expect(401);
    });

    it('rechaza un correo inexistente con 401', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'nadie@example.com', password: account.password })
        .expect(401);
    });

    it('GET /me devuelve los datos descifrados', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toMatchObject({ fullName: account.fullName, email: account.email.toLowerCase() });
    });

    it('GET /me/stored devuelve el registro cifrado', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/me/stored')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.emailEncrypted).toMatch(/^v1:/);
      expect(res.body.fullNameEncrypted).not.toContain(account.fullName);
      expect(res.body.passwordHash).toMatch(/^\$2[aby]\$/);
    });

    it('GET /me sin token responde 401', () => {
      return request(app.getHttpServer()).get('/api/auth/me').expect(401);
    });

    it('GET /me con token inválido responde 401', () => {
      return request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', 'Bearer token-falso')
        .expect(401);
    });
  });
});
