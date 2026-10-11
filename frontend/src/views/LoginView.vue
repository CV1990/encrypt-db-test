<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api, ApiError } from '@/api/client';
import { useAuth } from '@/composables/useAuth';

const route = useRoute();
const router = useRouter();
const { setToken } = useAuth();

const email = ref(typeof route.query.email === 'string' ? route.query.email : '');
const password = ref('');
const error = ref('');
const loading = ref(false);
const justRegistered = route.query.registered === '1';

async function onSubmit() {
  error.value = '';
  loading.value = true;
  try {
    const { accessToken } = await api.login(email.value, password.value);
    setToken(accessToken);
    router.push({ name: 'profile' });
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Error inesperado';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <section class="card">
    <h1>Iniciar sesión</h1>
    <p v-if="justRegistered" class="success" role="status">Cuenta creada. Ya puedes iniciar sesión.</p>
    <form @submit.prevent="onSubmit">
      <label>
        Correo electrónico
        <input v-model="email" name="email" type="email" required autocomplete="email" />
      </label>
      <label>
        Contraseña
        <input v-model="password" name="password" type="password" required autocomplete="current-password" />
      </label>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <button type="submit" :disabled="loading">{{ loading ? 'Entrando…' : 'Entrar' }}</button>
    </form>
    <p class="muted">¿No tienes cuenta? <RouterLink to="/register">Regístrate</RouterLink></p>
  </section>
</template>
