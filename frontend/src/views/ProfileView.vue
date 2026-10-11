<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api, ApiError, type PublicUser, type StoredUser } from '@/api/client';
import { useAuth } from '@/composables/useAuth';

const router = useRouter();
const { token, logout } = useAuth();

const user = ref<PublicUser | null>(null);
const stored = ref<StoredUser | null>(null);
const error = ref('');

onMounted(async () => {
  if (!token.value) return;
  try {
    [user.value, stored.value] = await Promise.all([api.me(token.value), api.stored(token.value)]);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      logout();
      router.push({ name: 'login' });
      return;
    }
    error.value = e instanceof ApiError ? e.message : 'Error inesperado';
  }
});
</script>

<template>
  <section class="card wide">
    <h1>Mi perfil</h1>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <p v-else-if="!user">Cargando…</p>

    <template v-if="user && stored">
      <h2>Datos descifrados por el servidor</h2>
      <dl data-test="decrypted">
        <dt>Nombre</dt>
        <dd data-test="fullName">{{ user.fullName }}</dd>
        <dt>Correo</dt>
        <dd data-test="email">{{ user.email }}</dd>
        <dt>Registrado</dt>
        <dd>{{ new Date(user.createdAt).toLocaleString() }}</dd>
      </dl>

      <h2>Cómo está guardado en PostgreSQL</h2>
      <dl class="stored" data-test="stored">
        <dt>email_hash <span class="tag">HMAC-SHA256 · una vía</span></dt>
        <dd><code>{{ stored.emailHash }}</code></dd>
        <dt>email_encrypted <span class="tag">AES-256-GCM</span></dt>
        <dd><code data-test="emailEncrypted">{{ stored.emailEncrypted }}</code></dd>
        <dt>full_name_encrypted <span class="tag">AES-256-GCM</span></dt>
        <dd><code>{{ stored.fullNameEncrypted }}</code></dd>
        <dt>password_hash <span class="tag">bcrypt · una vía</span></dt>
        <dd><code data-test="passwordHash">{{ stored.passwordHash }}</code></dd>
      </dl>
    </template>
  </section>
</template>
