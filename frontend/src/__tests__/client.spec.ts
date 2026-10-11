import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError } from '@/api/client';

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('api client', () => {
  afterEach(() => vi.restoreAllMocks());

  it('register hace POST a /api/auth/register con el cuerpo JSON', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(201, { id: '1' }));
    const payload = { fullName: 'Ana', email: 'ana@example.com', password: 'Secreta123' };

    await expect(api.register(payload)).resolves.toEqual({ id: '1' });
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('me envía el token en la cabecera Authorization', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(200, { id: '1' }));

    await api.me('mi-token');

    const [, init] = fetchMock.mock.calls[0];
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer mi-token');
  });

  it('lanza ApiError con el mensaje del backend', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(401, { message: 'Credenciales inválidas' }));

    await expect(api.login('a@b.com', 'x')).rejects.toEqual(new ApiError(401, 'Credenciales inválidas'));
  });

  it('une los mensajes de validación cuando el backend devuelve un array', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(400, { message: ['El correo no es válido', 'La contraseña es obligatoria'] }),
    );

    await expect(api.login('x', '')).rejects.toThrow('El correo no es válido. La contraseña es obligatoria');
  });

  it('lanza ApiError(0) si no hay conexión con el servidor', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(api.me('t')).rejects.toMatchObject({ status: 0, message: 'No se pudo conectar con el servidor' });
  });
});
