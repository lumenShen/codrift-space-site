import { createRouter, createWebHashHistory } from 'vue-router';

// 路由模式固定为 hash（createWebHashHistory）：
// GitHub Pages 静态托管下无需 404 回退配置，刷新/直链均可靠。
const router = createRouter({
  history: createWebHashHistory(),
  // 路由切换一律滚动回页顶（含浏览器前进/后退）。
  scrollBehavior() {
    return { top: 0, left: 0 };
  },
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/pages/HomePage.vue'),
    },
    {
      path: '/blog',
      name: 'blog-list',
      component: () => import('@/pages/BlogListPage.vue'),
    },
    {
      // 知识笔记专区：门户是站内页面，成品是 public/notes/ 下的静态阅读页
      path: '/notes',
      name: 'notes',
      component: () => import('@/pages/NotesPage.vue'),
    },
    {
      // :slug 对应内容条目的 slug（slug 规范见 docs/CONTRACTS.md）
      path: '/blog/:slug',
      name: 'blog-post',
      component: () => import('@/pages/BlogPostPage.vue'),
    },
  ],
});

export default router;
