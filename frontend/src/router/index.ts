import { createRouter, createWebHistory, type RouterHistory } from 'vue-router';
import { useAuth } from '@/composables/useAuth';
import LoginView from '@/views/LoginView.vue';
import ProfileView from '@/views/ProfileView.vue';
import RegisterView from '@/views/RegisterView.vue';

export function buildRouter(history: RouterHistory = createWebHistory()) {
  const router = createRouter({
    history,
    routes: [
      { path: '/', redirect: '/login' },
      { path: '/login', name: 'login', component: LoginView, meta: { guestOnly: true } },
      { path: '/register', name: 'register', component: RegisterView, meta: { guestOnly: true } },
      { path: '/profile', name: 'profile', component: ProfileView, meta: { requiresAuth: true } },
      { path: '/:pathMatch(.*)*', redirect: '/login' },
    ],
  });

  router.beforeEach((to) => {
    const { isAuthenticated } = useAuth();
    if (to.meta.requiresAuth && !isAuthenticated.value) return { name: 'login' };
    if (to.meta.guestOnly && isAuthenticated.value) return { name: 'profile' };
  });

  return router;
}
