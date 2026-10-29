<script setup lang="ts">
/*
 * RouterRail —— 左侧导航轨（DESIGN-V2 §2）。
 * 两种形态共用一套 DOM，几何全部由 CSS 断点驱动（≥1024px dock / 其余 overlay），
 * JS 侧的 docked prop 只负责 ARIA 语义与行为分支：
 *
 *   dock（≥1024px）   停靠左栏 264px、透明同面（页面地面即其面）、右缘 1px --line；
 *                     不是浮层、无 dialog 语义、无焦点圈闭；唯一开关是页头菜单钮。
 *   overlay（<1024px）Kimi 式抽屉：min(85vw,360px) 面板 + scrim + 底层内容右移缩退
 *                     （page-shift 在 App.vue）；四种关闭方式：scrim / Esc / 关闭钮 /
 *                     面板内路由跳转（§2.4）。
 *
 * 开合状态提升在 App.vue（本组件经 props/emits 收发）；焦点管理 §2.5：
 * 打开 → panel.focus()（tabindex=-1）+ Tab 首尾圈闭；关闭 → App 把焦点还给页头菜单钮。
 * 动画时长与曲线全走 --dur-xxx / --ease-xxx 令牌；reduced-motion 瞬时显隐；
 * reduced-transparency 面板收不透明实底（§6.4）。
 */
import { nextTick, onUnmounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { selectBlogEntries } from '@/components/content';

const props = defineProps<{
  /** ≥1024px：停靠态（桌面左栏）；否则 overlay 抽屉（App 的 useMediaQuery 提供） */
  docked: boolean;
  /** dock 态是否收起（页头菜单钮切换，状态持久化在 App） */
  collapsed: boolean;
  /** overlay 抽屉开合（状态在 App） */
  overlayOpen: boolean;
}>();

const emit = defineEmits<{ (e: 'update:overlayOpen', value: boolean): void }>();

const route = useRoute();
const panel = ref<HTMLElement | null>(null);

/* ---- 关键链接区（§2.1）：激活判定与页头 tab 同一张表（§1.2 末段）， ----
   ---- 不用 router-link-active（/blog 与 /blog/:slug 是兄弟路由记录，命中不了） ---- */
type LinkKey = 'home' | 'blog' | 'notes' | 'lab';

const navLinks: Array<{ key: LinkKey; label: string; to: string }> = [
  { key: 'home', label: '首页', to: '/' },
  { key: 'blog', label: '博客', to: '/blog' },
  { key: 'notes', label: '笔记', to: '/notes' },
  { key: 'lab', label: '组件实验室', to: '/lab' },
];

function isLinkActive(key: LinkKey): boolean {
  if (key === 'home') return route.name === 'home';
  if (key === 'blog') return route.name === 'blog-list' || route.name === 'blog-post';
  if (key === 'notes') {
    return (
      route.name === 'notes' ||
      route.name === 'notes-reader' ||
      route.name === 'notes-covers'
    );
  }
  return route.name === 'lab';
}

/* ---- 博客时间目录（§2.1）：tag 'post' 条目按 date 降序、按年分组； ----
   ---- 无 date 条目归入尾部「更早」组（registry 本就排序好，这里只分桶） ---- */
interface TocItem {
  slug: string;
  title: string;
  day: string; // MM-DD
}

interface TocGroup {
  label: string; // 年份或「更早」
  items: TocItem[];
}

const tocGroups = ref<TocGroup[]>([]);

function rebuildToc(): void {
  const map = new Map<string, TocItem[]>();
  const undated: TocItem[] = [];
  for (const entry of selectBlogEntries()) {
    const item: TocItem = {
      slug: entry.slug,
      title: entry.title,
      day: entry.date ? entry.date.slice(5, 10) : '—',
    };
    if (!entry.date) {
      undated.push(item);
      continue;
    }
    const year = entry.date.slice(0, 4);
    const bucket = map.get(year);
    if (bucket) bucket.push(item);
    else map.set(year, [item]);
  }
  const groups: TocGroup[] = [...map.entries()].map(([label, items]) => ({ label, items }));
  if (undated.length > 0) groups.push({ label: '更早', items: undated });
  tocGroups.value = groups;
}

rebuildToc();
// 条目集合在运行期不变（import.meta.glob eager 常量），构建期一次分桶即可。

/* 面板内任意 RouterLink 跳转后自动关（§2.4 第 4 条，仅 overlay 态） */
watch(
  () => route.fullPath,
  () => {
    if (!props.docked && props.overlayOpen) emit('update:overlayOpen', false);
  },
);

/* ---- overlay 开合副作用（§2.5）：滚动锁 / Esc / 面板聚焦 ---- */
let savedOverflow = '';

function onWindowKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape' && props.overlayOpen && !props.docked) {
    emit('update:overlayOpen', false);
  }
}

watch(
  () => props.overlayOpen && !props.docked,
  async (active) => {
    const root = document.documentElement;
    if (active) {
      savedOverflow = root.style.overflow;
      root.style.overflow = 'hidden'; // 滚动锁（不做 gutter 补偿，§2.5）
      window.addEventListener('keydown', onWindowKeydown);
      await nextTick();
      panel.value?.focus({ preventScroll: true });
    } else {
      root.style.overflow = savedOverflow;
      savedOverflow = '';
      window.removeEventListener('keydown', onWindowKeydown);
    }
  },
);

onUnmounted(() => {
  window.removeEventListener('keydown', onWindowKeydown);
  if (savedOverflow) {
    document.documentElement.style.overflow = savedOverflow;
    savedOverflow = '';
  }
});

/* 焦点圈闭（§2.5）：面板上监听 Tab，首尾循环 */
const FOCUSABLE =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

function onPanelKeydown(e: KeyboardEvent): void {
  if (!props.overlayOpen || props.docked || e.key !== 'Tab') return;
  const root = panel.value;
  if (!root) return;
  const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null,
  );
  if (items.length === 0) return;
  const first = items[0]!;
  const last = items[items.length - 1]!;
  const active = document.activeElement;
  if (e.shiftKey && (active === first || active === root)) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && active === last) {
    e.preventDefault();
    first.focus();
  }
}

function closeOverlay(): void {
  emit('update:overlayOpen', false);
}
</script>

<template>
  <!-- rail 层：z=var(--z-rail)(400)，本体 pointer-events:none，scrim/面板各自 auto -->
  <div class="rail-layer">
    <!-- scrim：仅 overlay 态渲染（dock 无遮罩）；层内 z=1（§1.5） -->
    <div
      v-if="!docked"
      class="rail-scrim"
      :class="{ 'is-open': overlayOpen }"
      aria-hidden="true"
      @click="closeOverlay"
    ></div>

    <!-- dock=普通 nav landmark；overlay 开启=dialog 语义（§2.5）。层内 z=2 -->
    <nav
      id="router-rail"
      ref="panel"
      class="rail"
      :class="{ 'is-open': overlayOpen && !docked, 'is-collapsed': docked && collapsed }"
      :role="!docked && overlayOpen ? 'dialog' : undefined"
      :aria-modal="!docked && overlayOpen ? 'true' : undefined"
      aria-label="站点导航"
      :tabindex="!docked && overlayOpen ? -1 : undefined"
      @keydown="onPanelKeydown"
    >
      <!-- overlay 顶行：小品牌 mark + 32px 关闭圆钮（仅 overlay 态渲染，§2.3） -->
      <div v-if="!docked" class="rail-topbar">
        <svg class="topbar-mark" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path
            d="M3 15c4-7 9-9 13-7"
            fill="none"
            stroke="var(--accent)"
            stroke-width="2.2"
            stroke-linecap="round"
          />
          <path
            d="M6 19c5-8 10-10 15-8"
            fill="none"
            stroke="var(--accent-2)"
            stroke-width="2.2"
            stroke-linecap="round"
            opacity="0.75"
          />
        </svg>
        <button type="button" class="rail-close" aria-label="关闭导航" @click="closeOverlay">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path
              d="M6 6l12 12M18 6 6 18"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>

      <!-- 个人区（§2.1）：40px mark 片 + 两行身份 -->
      <div class="rail-identity">
        <span class="identity-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22">
            <path
              d="M3 15c4-7 9-9 13-7"
              fill="none"
              stroke="var(--accent)"
              stroke-width="2.2"
              stroke-linecap="round"
            />
            <path
              d="M6 19c5-8 10-10 15-8"
              fill="none"
              stroke="var(--accent-2)"
              stroke-width="2.2"
              stroke-linecap="round"
              opacity="0.75"
            />
          </svg>
        </span>
        <span class="identity-text">
          <span class="identity-name">lumenShen</span>
          <span class="identity-domain">codrift.space</span>
        </span>
      </div>

      <!-- 关键链接区：首页/博客/笔记/GitHub(外链)/联系我(mailto) -->
      <div class="rail-links">
        <RouterLink
          v-for="link in navLinks"
          :key="link.key"
          :to="link.to"
          class="rail-link"
          :class="{ 'is-active': isLinkActive(link.key) }"
        >
          <svg v-if="link.key === 'home'" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path
              d="M4 11l8-7 8 7"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M6 9.5V20h12V9.5"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <svg v-else-if="link.key === 'blog'" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path
              d="M15 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linejoin="round"
            />
            <path d="M15 3v5h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
            <path d="M9 13h6M9 17h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
          <svg v-else-if="link.key === 'notes'" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path
              d="M15 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9z"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linejoin="round"
            />
            <path d="M15 3v6h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
          </svg>
          <svg v-else viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path
              d="M9.5 3h5M10.5 3v6.2l-5.1 9.1A1.8 1.8 0 0 0 7 21h10a1.8 1.8 0 0 0 1.6-2.7l-5.1-9.1V3"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path d="M7.8 15h8.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
          <span>{{ link.label }}</span>
        </RouterLink>

        <a
          class="rail-link"
          href="https://github.com/lumenShen/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path
              fill="currentColor"
              d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
            />
          </svg>
          <span>GitHub</span>
        </a>

        <a class="rail-link" href="mailto:gozaoo@outlook.com">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.8" />
            <path
              d="m3 7 9 6 9-6"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span>联系我</span>
        </a>
      </div>

      <!-- 博客时间目录：按年分组、区内滚动（§2.1） -->
      <div class="rail-toc">
        <section v-for="group in tocGroups" :key="group.label" class="toc-group">
          <h2 class="toc-year">{{ group.label }}</h2>
          <RouterLink
            v-for="item in group.items"
            :key="item.slug"
            :to="`/blog/${item.slug}`"
            class="toc-item"
            :class="{ 'is-current': route.params.slug === item.slug }"
          >
            <span class="toc-day">{{ item.day }}</span>
            <span class="toc-title">{{ item.title }}</span>
          </RouterLink>
        </section>
      </div>

      <!-- 底部 meta -->
      <p class="rail-meta">© 2026 Codrift</p>
    </nav>
  </div>
</template>

<style scoped>
.rail-layer {
  position: fixed;
  inset: 0;
  z-index: var(--z-rail);
  pointer-events: none;
}

/* ---- scrim（仅 overlay）：z=1，面板 z=2（§1.5 层内排序） ---- */
.rail-scrim {
  position: fixed;
  inset: 0;
  z-index: 1;
  background: var(--scrim);
  opacity: 0;
  visibility: hidden;
  pointer-events: auto;
  transition:
    opacity var(--dur-base) ease-out,
    visibility 0s var(--dur-base);
}

.rail-scrim.is-open {
  opacity: 1;
  visibility: visible;
  transition: opacity var(--dur-base) ease-out;
}

/* ---- 面板：默认 overlay 形态（Kimi 抽屉，§2.3），dock 在媒体查询里覆盖 ---- */
.rail {
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  width: var(--rail-overlay-w);
  padding: var(--space-4);
  background: var(--rail-panel-bg);
  backdrop-filter: blur(24px) saturate(1.2);
  -webkit-backdrop-filter: blur(24px) saturate(1.2);
  border-right: 1px solid var(--line-strong);
  box-shadow: var(--shadow-2);
  pointer-events: auto;
  overflow: hidden;
  /* 进场 360ms / 退场 240ms，与 scrim、底层位移同曲线（§2.3） */
  transform: translateX(-100%);
  visibility: hidden;
  transition:
    transform var(--dur-base) var(--ease-drawer),
    visibility 0s var(--dur-base);
}

.rail.is-open {
  transform: translateX(0);
  visibility: visible;
  transition: transform var(--dur-slow) var(--ease-drawer);
}

/* ---- dock 形态（≥1024px，§2.2）：停靠左栏、透明同面、仅右缘 1px 分隔 ---- */
@media (min-width: 1024px) {
  .rail {
    width: var(--rail-w);
    padding: var(--space-3) var(--space-4);
    background: transparent;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    border-right: 1px solid var(--line);
    box-shadow: none;
    overflow: visible;
    transform: none;
    visibility: visible;
    /* 收起＝滑出而非压扁（评审 #9）：margin-left + visibility。
       visibility 的隐藏延迟只放在收起分支（滑出动画播完再藏，且不留隐形焦点目标）；
       展开分支立即显示，否则滑入全程不可见。 */
    transition:
      margin-left var(--dur-base) var(--ease-out-quart),
      visibility 0s;
  }

  .rail.is-collapsed {
    margin-left: calc(-1 * var(--rail-w));
    visibility: hidden;
    transition:
      margin-left var(--dur-base) var(--ease-out-quart),
      visibility 0s var(--dur-base);
  }
}

/* ---- overlay 顶行 ---- */
.rail-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-2);
}

.rail-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--fg-1);
  cursor: pointer;
  transition:
    background-color var(--dur-fast) ease-out,
    color var(--dur-fast) ease-out;
}

.rail-close:hover {
  background: var(--tab-hover);
  color: var(--fg-0);
}

/* ---- 个人区（§2.1） ---- */
.rail-identity {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 60px;
  padding-bottom: var(--space-3);
  margin-bottom: var(--space-3);
  border-bottom: 1px solid var(--line);
}

.identity-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  background: var(--accent-dim);
  flex: none;
}

.identity-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.identity-name {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--fg-0);
}

.identity-domain {
  font-size: 0.75rem;
  color: var(--fg-2);
}

/* ---- 关键链接区（§2.1） ---- */
.rail-links {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rail-link {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  height: 40px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-sm);
  color: var(--fg-1);
  font-size: 0.875rem;
  transition:
    background-color var(--dur-fast) ease-out,
    color var(--dur-fast) ease-out;
}

.rail-link:hover {
  background: var(--tab-hover);
  color: var(--fg-0);
}

.rail-link.is-active {
  background: var(--accent-dim);
  color: var(--accent-strong);
}

.rail-link svg {
  flex: none;
}

/* ---- 博客时间目录（§2.1）：按年分组、区内滚动、细滚动条 ---- */
.rail-toc {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  margin-top: var(--space-3);
  border-top: 1px solid var(--line);
  padding-top: var(--space-2);
  scrollbar-width: thin;
  scrollbar-color: var(--scrollbar-thumb) transparent;
}

.rail-toc::-webkit-scrollbar {
  width: 6px;
}

.rail-toc::-webkit-scrollbar-track {
  background: transparent;
}

.rail-toc::-webkit-scrollbar-thumb {
  border: none;
  border-radius: var(--radius-full);
  background-color: var(--scrollbar-thumb);
}

.rail-toc::-webkit-scrollbar-thumb:hover {
  background-color: var(--scrollbar-thumb-hover);
}

/* 组头=内容层级（时间分桶），不是 eyebrow（§2.1） */
.toc-year {
  margin: var(--space-3) var(--space-3) var(--space-2);
  color: var(--fg-2);
  font-family: var(--font-display);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
}

.toc-item {
  display: grid;
  grid-template-columns: 44px 1fr;
  gap: var(--space-2);
  align-items: center;
  height: 40px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-sm);
  transition: background-color var(--dur-fast) ease-out;
}

.toc-item:hover {
  background: var(--tab-hover);
}

.toc-item:hover .toc-title {
  color: var(--fg-0);
}

.toc-day {
  font-size: 0.75rem;
  color: var(--fg-2);
  font-variant-numeric: tabular-nums;
}

.toc-title {
  font-size: 0.875rem;
  color: var(--fg-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 当前阅读项（§2.1）：日期走 --accent-text（§3.6 墨水通则——暗色下与 --accent
   同值，亮色下自动落到达标的深一档） */
.toc-item.is-current .toc-title {
  color: var(--accent-strong);
}

.toc-item.is-current .toc-day {
  color: var(--accent-text);
}

/* ---- 底部 meta（§2.1） ---- */
.rail-meta {
  margin: 0;
  padding-top: var(--space-3);
  border-top: 1px solid var(--line);
  color: var(--fg-2);
  font-size: 0.75rem;
}

/* ---- reduced-motion：抽屉三件套瞬时显隐（§2.5/§6.3） ---- */
@media (prefers-reduced-motion: reduce) {
  .rail,
  .rail.is-open,
  .rail-scrim,
  .rail-close,
  .rail-link,
  .toc-item {
    transition: none;
  }
}

/* ---- reduced-transparency：面板收不透明实底（§6.4） ---- */
@media (prefers-reduced-transparency: reduce) {
  .rail {
    background: var(--bg-1); /* 暗色 #070c18 / 亮色 #f4f7fc，即规格给的两个实底 */
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
}
</style>
