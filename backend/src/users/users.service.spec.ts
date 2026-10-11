import { ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryFailedError } from 'typeorm';
import { EncryptionService } from '../crypto/encryption.service';
import { HashingService } from '../crypto/hashing.service';
import { User } from './user.entity';
import { UsersService } from './users.service';

const config = {
  ENCRYPTION_KEY: 'a'.repeat(64),
  BLIND_INDEX_KEY: 'b'.repeat(64),
  BCRYPT_ROUNDS: '4',
} as Record<string, string>;

describe('UsersService', () => {
  let service: UsersService;
  let encryption: EncryptionService;
  const repo = {
    findOne: jest.fn(),
    create: jest.fn((data: Partial<User>) => ({ ...data }) as User),
    save: jest.fn(async (user: User) => ({ ...user, id: 'uuid-1', createdAt: new Date('2026-01-01') })),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        EncryptionService,
        HashingService,
        { provide: getRepositoryToken(User), useValue: repo },
        {
          provide: ConfigService,
          useValue: { get: (k: string) => config[k], getOrThrow: (k: string) => config[k] },
        },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
    encryption = moduleRef.get(EncryptionService);
  });

  describe('create', () => {
    it('guarda email y nombre cifrados, blind index y contraseña con hash', async () => {
      repo.findOne.mockResolvedValue(null);

      const user = await service.create({
        fullName: '  Ana López ',
        email: 'Ana@Example.com',
        password: 'Secreta123',
      });

      const saved = repo.save.mock.calls[0][0] as User;
      expect(saved.emailHash).toBe(encryption.blindIndex('ana@example.com'));
      expect(saved.emailEncrypted).not.toContain('ana');
      expect(encryption.decrypt(saved.emailEncrypted)).toBe('ana@example.com');
      expect(encryption.decrypt(saved.fullNameEncrypted)).toBe('Ana López');
      expect(saved.passwordHash).toMatch(/^\$2[aby]\$/);
      expect(saved.passwordHash).not.toContain('Secreta123');
      expect(user.id).toBe('uuid-1');
    });

    it('lanza ConflictException si el email ya existe', async () => {
      repo.findOne.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create({ fullName: 'Ana', email: 'ana@example.com', password: 'Secreta123' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('traduce la violación de unicidad de Postgres a ConflictException', async () => {
      repo.findOne.mockResolvedValue(null);
      repo.save.mockRejectedValueOnce(
        new QueryFailedError('INSERT', [], Object.assign(new Error('duplicate'), { code: '23505' })),
      );

      await expect(
        service.create({ fullName: 'Ana', email: 'ana@example.com', password: 'Secreta123' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('propaga otros errores de base de datos', async () => {
      repo.findOne.mockResolvedValue(null);
      repo.save.mockRejectedValueOnce(new Error('conexión perdida'));

      await expect(
        service.create({ fullName: 'Ana', email: 'ana@example.com', password: 'Secreta123' }),
      ).rejects.toThrow('conexión perdida');
    });
  });

  it('findByEmail busca por el blind index normalizado', async () => {
    repo.findOne.mockResolvedValue(null);

    await service.findByEmail(' ANA@example.com');

    expect(repo.findOne).toHaveBeenCalledWith({
      where: { emailHash: encryption.blindIndex('ana@example.com') },
    });
  });

  it('findById busca por id', async () => {
    repo.findOne.mockResolvedValue(null);

    await service.findById('uuid-1');

    expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 'uuid-1' } });
  });

  it('toPublic descifra los datos y no expone el hash de la contraseña', () => {
    const user = {
      id: 'uuid-1',
      emailHash: 'hash',
      emailEncrypted: encryption.encrypt('ana@example.com'),
      fullNameEncrypted: encryption.encrypt('Ana López'),
      passwordHash: '$2b$04$xxx',
      createdAt: new Date('2026-01-01'),
    } as User;

    const result = service.toPublic(user);

    expect(result).toEqual({
      id: 'uuid-1',
      email: 'ana@example.com',
      fullName: 'Ana López',
      createdAt: user.createdAt,
    });
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('toStored devuelve el registro tal cual está en la base de datos', () => {
    const user = {
      id: 'uuid-1',
      emailHash: 'hash',
      emailEncrypted: 'v1:a:b:c',
      fullNameEncrypted: 'v1:d:e:f',
      passwordHash: '$2b$04$xxx',
      createdAt: new Date('2026-01-01'),
    } as User;

    expect(service.toStored(user)).toEqual({ ...user });
  });
});
