<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuth } from '@/composables/useAuth';

const { isAuthenticated, logout } = useAuth();
const router = useRouter();

function onLogout() {
  logout();
  router.push({ name: 'login' });
}
</script>

<template>
  <header class="topbar">
    <span class="brand">🔐 Encrypt DB Test</span>
    <nav>
      <template v-if="isAuthenticated">
        <RouterLink to="/profile">Mi perfil</RouterLink>
        <button class="link" data-test="logout" @click="onLogout">Cerrar sesión</button>
      </template>
      <template v-else>
        <RouterLink to="/login">Iniciar sesión</RouterLink>
        <RouterLink to="/register">Registrarse</RouterLink>
      </template>
    </nav>
  </header>
  <main class="container">
    <RouterView />
  </main>
</template>
