import { createRouter, createWebHashHistory } from 'vue-router';

// 路由模式固定为 hash（createWebHashHistory）：
// GitHub Pages 静态托管下无需 404 回退配置，刷新/直链均可靠。
const router = createRouter({
  history: createWebHashHistory(),
  // 路由切换的滚动策略：
  //   - 阅读器是覆盖在笔记库上的全屏面板，开/关时不动底层页面（否则关掉阅读器会丢掉阅读位置）；
  //   - 其余路由切换一律回页顶（含浏览器前进/后退）。
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition;
    const openingReader = to.name === 'notes-reader';
    const closingReader = from.name === 'notes-reader' && to.name === 'notes';
    if (openingReader || closingReader) return false;
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
      // 封面版式对照页：四种笔记 × 五套版式，选定后用 cover-data 的默认值切换
      path: '/notes/covers',
      name: 'notes-covers',
      component: () => import('@/pages/NotesCoverLabPage.vue'),
    },
    {
      // 笔记深链：/notes/:collectionId/:chapterId?
      // 站外分享一个具体单元时不必再让人从门户里点进来；chapterId 省略时打开第一章。
      // 章节内的锚点走 ?section=<id>（阅读器会把它传给 iframe 的 hash）。
      path: '/notes/:collectionId/:chapterId?',
      name: 'notes-reader',
      component: () => import('@/pages/NotesPage.vue'),
    },
    {
      // 前端组件实验室：当前第一组实验是 Codrift / Rein 的液态玻璃
      path: '/lab',
      name: 'lab',
      component: () => import('@/pages/ComponentLabPage.vue'),
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
