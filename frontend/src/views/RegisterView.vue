<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api, ApiError } from '@/api/client';

const router = useRouter();
const form = reactive({ fullName: '', email: '', password: '', confirmPassword: '' });
const error = ref('');
const loading = ref(false);

const passwordValid = computed(
  () => form.password.length >= 8 && /[A-Za-z]/.test(form.password) && /\d/.test(form.password),
);

async function onSubmit() {
  error.value = '';
  if (!passwordValid.value) {
    error.value = 'La contraseña debe tener al menos 8 caracteres, letras y números';
    return;
  }
  if (form.password !== form.confirmPassword) {
    error.value = 'Las contraseñas no coinciden';
    return;
  }

  loading.value = true;
  try {
    await api.register({ fullName: form.fullName, email: form.email, password: form.password });
    router.push({ name: 'login', query: { registered: '1', email: form.email } });
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Error inesperado';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <section class="card">
    <h1>Crear cuenta</h1>
    <form @submit.prevent="onSubmit">
      <label>
        Nombre completo
        <input v-model="form.fullName" name="fullName" required maxlength="100" autocomplete="name" />
      </label>
      <label>
        Correo electrónico
        <input v-model="form.email" name="email" type="email" required autocomplete="email" />
      </label>
      <label>
        Contraseña
        <input v-model="form.password" name="password" type="password" required autocomplete="new-password" />
        <small>Mínimo 8 caracteres, con letras y números.</small>
      </label>
      <label>
        Confirmar contraseña
        <input
          v-model="form.confirmPassword"
          name="confirmPassword"
          type="password"
          required
          autocomplete="new-password"
        />
      </label>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <button type="submit" :disabled="loading">{{ loading ? 'Registrando…' : 'Registrarse' }}</button>
    </form>
    <p class="muted">¿Ya tienes cuenta? <RouterLink to="/login">Inicia sesión</RouterLink></p>
  </section>
</template>
