import { ConfigService } from '@nestjs/config';
import { HashingService } from './hashing.service';

describe('HashingService', () => {
  const service = new HashingService({ get: () => '4' } as unknown as ConfigService);

  it('genera un hash bcrypt que no contiene la contraseña', async () => {
    const hash = await service.hash('Secreta123');

    expect(hash).toMatch(/^\$2[aby]\$04\$/);
    expect(hash).not.toContain('Secreta123');
  });

  it('usa sal aleatoria: la misma contraseña produce hashes distintos', async () => {
    expect(await service.hash('Secreta123')).not.toBe(await service.hash('Secreta123'));
  });

  it('verifica la contraseña correcta y rechaza la incorrecta', async () => {
    const hash = await service.hash('Secreta123');

    await expect(service.compare('Secreta123', hash)).resolves.toBe(true);
    await expect(service.compare('otra', hash)).resolves.toBe(false);
  });
});
