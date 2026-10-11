import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from './auth.guard';

const contextFor = (request: Record<string, unknown>) =>
  ({ switchToHttp: () => ({ getRequest: () => request }) }) as unknown as ExecutionContext;

describe('AuthGuard', () => {
  const jwtService = new JwtService({ secret: 'test-secret' });
  const guard = new AuthGuard(jwtService);

  it('permite el acceso con un token válido y adjunta el payload', async () => {
    const token = await jwtService.signAsync({ sub: 'uuid-1' });
    const request: Record<string, unknown> = { headers: { authorization: `Bearer ${token}` } };

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.user).toMatchObject({ sub: 'uuid-1' });
  });

  it('rechaza peticiones sin token', async () => {
    await expect(guard.canActivate(contextFor({ headers: {} }))).rejects.toThrow('Token no proporcionado');
  });

  it('rechaza un esquema distinto de Bearer', async () => {
    await expect(
      guard.canActivate(contextFor({ headers: { authorization: 'Basic abc' } })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rechaza un token firmado con otro secreto', async () => {
    const token = await new JwtService({ secret: 'otro' }).signAsync({ sub: 'uuid-1' });

    await expect(
      guard.canActivate(contextFor({ headers: { authorization: `Bearer ${token}` } })),
    ).rejects.toThrow('Token inválido o expirado');
  });
});
