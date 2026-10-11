import { computed, ref } from 'vue';

const STORAGE_KEY = 'accessToken';

const token = ref<string | null>(localStorage.getItem(STORAGE_KEY));

export function useAuth() {
  function setToken(value: string) {
    token.value = value;
    localStorage.setItem(STORAGE_KEY, value);
  }

  function logout() {
    token.value = null;
    localStorage.removeItem(STORAGE_KEY);
  }

  return {
    token,
    isAuthenticated: computed(() => token.value !== null),
    setToken,
    logout,
  };
}
