import { createApp } from 'vue';
import App from './App.vue';
import { buildRouter } from './router';
import './style.css';

createApp(App).use(buildRouter()).mount('#app');
