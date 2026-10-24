import { createApp } from 'vue';

import App from './App.vue';
import router from './router';

import './styles/tokens.css';
import './styles/base.css';

/* 展示字体（拉丁：站名/标题）：Archivo 变量字，自托管（SIL OFL 1.1） */
import '@fontsource-variable/archivo/index.css';

createApp(App).use(router).mount('#app');
