import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { HashingService } from '../crypto/hashing.service';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const user = { id: 'uuid-1', passwordHash: '$2b$hash' } as User;
  const publicUser = {
    id: 'uuid-1',
    email: 'ana@example.com',
    fullName: 'Ana',
    createdAt: new Date('2026-01-01'),
  };

  const usersService = {
    create: jest.fn(),
    findByEmail: jest.fn(),
    toPublic: jest.fn().mockReturnValue(publicUser),
  };
  const hashing = { compare: jest.fn() };
  const jwtService = { signAsync: jest.fn().mockResolvedValue('jwt-token') };

  const service = new AuthService(
    usersService as unknown as UsersService,
    hashing as unknown as HashingService,
    jwtService as unknown as JwtService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('register crea el usuario y devuelve sus datos públicos', async () => {
    usersService.create.mockResolvedValue(user);
    const dto = { fullName: 'Ana', email: 'ana@example.com', password: 'Secreta123' };

    await expect(service.register(dto)).resolves.toEqual(publicUser);
    expect(usersService.create).toHaveBeenCalledWith(dto);
  });

  it('login devuelve un JWT con el id del usuario si las credenciales son correctas', async () => {
    usersService.findByEmail.mockResolvedValue(user);
    hashing.compare.mockResolvedValue(true);

    const result = await service.login({ email: 'ana@example.com', password: 'Secreta123' });

    expect(hashing.compare).toHaveBeenCalledWith('Secreta123', user.passwordHash);
    expect(jwtService.signAsync).toHaveBeenCalledWith({ sub: 'uuid-1' });
    expect(result).toEqual({ accessToken: 'jwt-token', user: publicUser });
  });

  it('login rechaza una contraseña incorrecta', async () => {
    usersService.findByEmail.mockResolvedValue(user);
    hashing.compare.mockResolvedValue(false);

    await expect(service.login({ email: 'ana@example.com', password: 'mala' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });

  it('login rechaza un correo inexistente con el mismo mensaje', async () => {
    usersService.findByEmail.mockResolvedValue(null);

    await expect(service.login({ email: 'nadie@example.com', password: 'x' })).rejects.toThrow(
      'Credenciales inválidas',
    );
    expect(hashing.compare).not.toHaveBeenCalled();
  });
});
