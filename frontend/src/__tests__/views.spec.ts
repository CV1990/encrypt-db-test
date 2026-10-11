import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory } from 'vue-router';
import { api, ApiError } from '@/api/client';
import App from '@/App.vue';
import { useAuth } from '@/composables/useAuth';
import { buildRouter } from '@/router';

vi.mock('@/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/client')>();
  return {
    ...actual,
    api: { register: vi.fn(), login: vi.fn(), me: vi.fn(), stored: vi.fn() },
  };
});

const publicUser = {
  id: 'uuid-1',
  fullName: 'Ana López',
  email: 'ana@example.com',
  createdAt: '2026-01-01T00:00:00.000Z',
};
const storedUser = {
  id: 'uuid-1',
  emailHash: 'a'.repeat(64),
  emailEncrypted: 'v1:aXY=:dGFn:Y2lwaGVy',
  fullNameEncrypted: 'v1:aXY=:dGFn:bm9tYnJl',
  passwordHash: '$2b$12$abcdefghijklmnopqrstuv',
  createdAt: publicUser.createdAt,
};

async function mountAt(path: string) {
  const router = buildRouter(createMemoryHistory());
  router.push(path);
  await router.isReady();
  const wrapper = mount(App, { global: { plugins: [router] } });
  return { wrapper, router };
}

describe('Vistas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth().logout();
  });

  describe('Registro', () => {
    it('valida que las contraseñas coincidan sin llamar a la API', async () => {
      const { wrapper } = await mountAt('/register');
      await wrapper.find('input[name=fullName]').setValue('Ana');
      await wrapper.find('input[name=email]').setValue('ana@example.com');
      await wrapper.find('input[name=password]').setValue('Secreta123');
      await wrapper.find('input[name=confirmPassword]').setValue('Distinta123');
      await wrapper.find('form').trigger('submit');

      expect(wrapper.find('[role=alert]').text()).toBe('Las contraseñas no coinciden');
      expect(api.register).not.toHaveBeenCalled();
    });

    it('valida la fortaleza de la contraseña', async () => {
      const { wrapper } = await mountAt('/register');
      await wrapper.find('input[name=password]').setValue('solotexto');
      await wrapper.find('input[name=confirmPassword]').setValue('solotexto');
      await wrapper.find('form').trigger('submit');

      expect(wrapper.find('[role=alert]').text()).toContain('letras y números');
      expect(api.register).not.toHaveBeenCalled();
    });

    it('registra y redirige al login', async () => {
      vi.mocked(api.register).mockResolvedValue(publicUser);
      const { wrapper, router } = await mountAt('/register');
      await wrapper.find('input[name=fullName]').setValue('Ana López');
      await wrapper.find('input[name=email]').setValue('ana@example.com');
      await wrapper.find('input[name=password]').setValue('Secreta123');
      await wrapper.find('input[name=confirmPassword]').setValue('Secreta123');
      await wrapper.find('form').trigger('submit');
      await flushPromises();

      expect(api.register).toHaveBeenCalledWith({
        fullName: 'Ana López',
        email: 'ana@example.com',
        password: 'Secreta123',
      });
      expect(router.currentRoute.value.name).toBe('login');
      expect(wrapper.find('[role=status]').text()).toContain('Cuenta creada');
      expect((wrapper.find('input[name=email]').element as HTMLInputElement).value).toBe('ana@example.com');
    });

    it('muestra el error del backend (correo duplicado)', async () => {
      vi.mocked(api.register).mockRejectedValue(new ApiError(409, 'El correo ya está registrado'));
      const { wrapper } = await mountAt('/register');
      await wrapper.find('input[name=fullName]').setValue('Ana');
      await wrapper.find('input[name=email]').setValue('ana@example.com');
      await wrapper.find('input[name=password]').setValue('Secreta123');
      await wrapper.find('input[name=confirmPassword]').setValue('Secreta123');
      await wrapper.find('form').trigger('submit');
      await flushPromises();

      expect(wrapper.find('[role=alert]').text()).toBe('El correo ya está registrado');
    });
  });

  describe('Login', () => {
    it('guarda el token y redirige al perfil', async () => {
      vi.mocked(api.login).mockResolvedValue({ accessToken: 'jwt', user: publicUser });
      vi.mocked(api.me).mockResolvedValue(publicUser);
      vi.mocked(api.stored).mockResolvedValue(storedUser);
      const { wrapper, router } = await mountAt('/login');
      await wrapper.find('input[name=email]').setValue('ana@example.com');
      await wrapper.find('input[name=password]').setValue('Secreta123');
      await wrapper.find('form').trigger('submit');
      await flushPromises();

      expect(api.login).toHaveBeenCalledWith('ana@example.com', 'Secreta123');
      expect(useAuth().token.value).toBe('jwt');
      expect(localStorage.getItem('accessToken')).toBe('jwt');
      expect(router.currentRoute.value.name).toBe('profile');
    });

    it('muestra el error de credenciales inválidas', async () => {
      vi.mocked(api.login).mockRejectedValue(new ApiError(401, 'Credenciales inválidas'));
      const { wrapper } = await mountAt('/login');
      await wrapper.find('input[name=email]').setValue('ana@example.com');
      await wrapper.find('input[name=password]').setValue('mala');
      await wrapper.find('form').trigger('submit');
      await flushPromises();

      expect(wrapper.find('[role=alert]').text()).toBe('Credenciales inválidas');
      expect(useAuth().isAuthenticated.value).toBe(false);
    });
  });

  describe('Perfil', () => {
    it('redirige al login si no hay sesión', async () => {
      const { router } = await mountAt('/profile');
      expect(router.currentRoute.value.name).toBe('login');
    });

    it('muestra los datos descifrados y el registro cifrado', async () => {
      useAuth().setToken('jwt');
      vi.mocked(api.me).mockResolvedValue(publicUser);
      vi.mocked(api.stored).mockResolvedValue(storedUser);
      const { wrapper } = await mountAt('/profile');
      await flushPromises();

      expect(api.me).toHaveBeenCalledWith('jwt');
      expect(wrapper.find('[data-test=fullName]').text()).toBe('Ana López');
      expect(wrapper.find('[data-test=email]').text()).toBe('ana@example.com');
      expect(wrapper.find('[data-test=emailEncrypted]').text()).toBe(storedUser.emailEncrypted);
      expect(wrapper.find('[data-test=passwordHash]').text()).toBe(storedUser.passwordHash);
    });

    it('cierra la sesión si el token expiró (401)', async () => {
      useAuth().setToken('expirado');
      vi.mocked(api.me).mockRejectedValue(new ApiError(401, 'Token inválido o expirado'));
      vi.mocked(api.stored).mockRejectedValue(new ApiError(401, 'Token inválido o expirado'));
      const { router } = await mountAt('/profile');
      await flushPromises();

      expect(useAuth().isAuthenticated.value).toBe(false);
      expect(router.currentRoute.value.name).toBe('login');
    });

    it('el botón de cerrar sesión limpia el token', async () => {
      useAuth().setToken('jwt');
      vi.mocked(api.me).mockResolvedValue(publicUser);
      vi.mocked(api.stored).mockResolvedValue(storedUser);
      const { wrapper, router } = await mountAt('/profile');
      await flushPromises();
      await wrapper.find('[data-test=logout]').trigger('click');
      await flushPromises();

      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(router.currentRoute.value.name).toBe('login');
    });
  });
});
