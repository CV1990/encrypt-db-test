import { NotFoundException } from '@nestjs/common';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { AuthController } from './auth.controller';
import { AuthenticatedRequest } from './auth.guard';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  const user = { id: 'uuid-1' } as User;
  const authService = { register: jest.fn(), login: jest.fn() };
  const usersService = {
    findById: jest.fn(),
    toPublic: jest.fn().mockReturnValue({ id: 'uuid-1', email: 'ana@example.com' }),
    toStored: jest.fn().mockReturnValue({ id: 'uuid-1', emailEncrypted: 'v1:...' }),
  };
  const controller = new AuthController(
    authService as unknown as AuthService,
    usersService as unknown as UsersService,
  );
  const req = { user: { sub: 'uuid-1' } } as AuthenticatedRequest;

  beforeEach(() => jest.clearAllMocks());

  it('register delega en AuthService', async () => {
    const dto = { fullName: 'Ana', email: 'ana@example.com', password: 'Secreta123' };
    authService.register.mockResolvedValue({ id: 'uuid-1' });

    await expect(controller.register(dto)).resolves.toEqual({ id: 'uuid-1' });
    expect(authService.register).toHaveBeenCalledWith(dto);
  });

  it('login delega en AuthService', async () => {
    authService.login.mockResolvedValue({ accessToken: 't' });

    await expect(controller.login({ email: 'a@b.com', password: 'x' })).resolves.toEqual({ accessToken: 't' });
  });

  it('me devuelve los datos descifrados del usuario del token', async () => {
    usersService.findById.mockResolvedValue(user);

    await expect(controller.me(req)).resolves.toEqual({ id: 'uuid-1', email: 'ana@example.com' });
    expect(usersService.findById).toHaveBeenCalledWith('uuid-1');
  });

  it('stored devuelve el registro cifrado del usuario del token', async () => {
    usersService.findById.mockResolvedValue(user);

    await expect(controller.stored(req)).resolves.toEqual({ id: 'uuid-1', emailEncrypted: 'v1:...' });
  });

  it('lanza NotFoundException si el usuario del token ya no existe', async () => {
    usersService.findById.mockResolvedValue(null);

    await expect(controller.me(req)).rejects.toBeInstanceOf(NotFoundException);
  });
});
