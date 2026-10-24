<script setup lang="ts">
/*
 * SiteHeader V2 —— 无通栏底、单点对齐的悬浮页头（DESIGN-V2 §1）。
 * 一排独立小元素共享一条 40px 垂直中轴线（移动 36px），全部悬浮在内容上：
 *   菜单钮 → 品牌胶囊（轻玻璃）→ tab 组（首页/博客/笔记）→ 弹性空隙
 *   → 主题钮 → GitHub 钮 → CTA「联系我」（实底主色）。
 * 页头属于窗口、不属于 1080 文档列：左端贴 rail 右缘 + 24px（--rail-offset 联动），
 * 右端贴视口右 - 24px，不做 max-width 居中。
 *
 * 层级（headerIssue 修复 A'，§1.5）：GradualBlur 调用 target="parent"（absolute 分支
 * 无 +100 隐式提升），条带 :z-index="1" < .header-row 的 2 —— 模糊条带落在胶囊之下、
 * 仍在 header-layer(z=100) 内继续盖住页面内容。**本站页头禁用 page 级 target 形态**
 * （+100 陷阱 + fixed 全宽会糊住 dock rail，§1.4）。条带外层 .header-blur-fade
 * 只承担偏移（left: var(--rail-offset)，dock 展开时从 rail 右缘起）；滚动显隐
 * 逐层过渡 backdrop-filter 的 blur 值——外层不能挂 opacity 显隐：opacity < 1
 * 的祖先形成 backdrop root，条带的 backdrop 采样瞬间变空，模糊只会在过渡
 * 端点整块跳变（突变）。
 *
 * 滚动两态（§1.3）：根元素 data-scrolled="true|false"（阈值 24px，passive scroll）——
 * 幽灵态：tab/圆钮透明底、条带各层 blur 归零；悬浮态：品牌胶囊取轻玻璃、
 * 条带各层 blur 经 var(--dur-base) 长回目标值。
 *
 * 导航高亮（§1.2 末段）：/blog 与 /blog/:slug 是兄弟路由记录，不得用
 * router-link-active；统一按 route.name computed 挂自定义 class（与 rail 同表）。
 */
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { GradualBlur } from '@/effects';
import ThemeToggle from '@/components/ThemeToggle.vue';

const props = defineProps<{
  /** dock 态 rail 是否收起（状态在 App，≥1024px 有效） */
  railCollapsed?: boolean;
  /** overlay 抽屉是否打开（<1024px 有效） */
  overlayOpen?: boolean;
  /** ≥1024px 停靠态（App 的 useMediaQuery 提供） */
  railDocked?: boolean;
}>();

const emit = defineEmits<{ (e: 'toggle-rail'): void }>();

const route = useRoute();

/* ---- 导航高亮（§1.2 末段判定表） ---- */
const isHomeActive = computed(() => route.name === 'home');
const isBlogActive = computed(
  () => route.name === 'blog-list' || route.name === 'blog-post',
);
const isNotesActive = computed(() => route.name === 'notes');

/* ---- 滚动两态（阈值 24px，与 FloatingActions 同法：passive scroll） ---- */
const scrolled = ref(false);

function onScroll(): void {
  scrolled.value = window.scrollY > 24;
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
});

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll);
});

/* ---- 菜单钮：图标随形态与状态 ----
   dock（≥1024px）：收起 ☰ / 展开 ⇤；overlay（<1024px）：关 ☰ / 开 × */
const overlayOpen = computed(() => props.overlayOpen === true);
const menuAriaExpanded = computed(() =>
  props.railDocked === true ? !props.railCollapsed : overlayOpen.value,
);

/** overlay 关闭后焦点归还菜单钮（§2.5，App 调用） */
function focusMenuButton(): void {
  menuButton.value?.focus({ preventScroll: true });
}

const menuButton = ref<HTMLButtonElement | null>(null);

defineExpose({ focusMenuButton });
</script>

<template>
  <header class="header-layer" :data-scrolled="scrolled ? 'true' : 'false'">
    <!-- 滚动渐进模糊条带：外层承担偏移（不糊 rail），显隐靠逐层 blur 值过渡（§1.4） -->
    <div class="header-blur-fade" aria-hidden="true">
      <GradualBlur
        position="top"
        target="parent"
        height="5.5rem"
        :strength="2"
        :div-count="5"
        :z-index="1"
      />
    </div>

    <div class="header-row">
      <!-- 菜单钮：dock 切收展（☰/⇤），overlay 开抽屉（☰/×） -->
      <button
        ref="menuButton"
        type="button"
        class="round-btn menu-btn"
        :aria-expanded="menuAriaExpanded"
        aria-controls="router-rail"
        aria-label="导航菜单"
        @click="emit('toggle-rail')"
      >
        <!-- ☰（dock 收起 / overlay 关闭） -->
        <svg v-if="!(railDocked && !railCollapsed) && !overlayOpen" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path
            d="M4 7h16M4 12h16M4 17h16"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
          />
        </svg>
        <!-- ⇤（dock 展开：收起 rail） -->
        <svg v-if="railDocked && !railCollapsed" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.8" />
          <path d="M9 4v16" fill="none" stroke="currentColor" stroke-width="1.8" />
          <path
            d="m16 15-3-3 3-3"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <!-- ×（overlay 开启） -->
        <svg v-if="!railDocked && overlayOpen" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path
            d="M6 6l12 12M18 6 6 18"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
          />
        </svg>
      </button>

      <!-- 品牌胶囊：幽灵态透明，悬浮态取轻玻璃（§3.4.2 .chip-glass） -->
      <RouterLink to="/" class="brand-chip" :class="{ 'chip-glass': scrolled }">
        <svg class="brand-mark" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
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
        <span class="brand-name">Codrift</span>
      </RouterLink>

      <!-- 导航 tab：激活按 route.name 判定（不用 router-link-active） -->
      <nav class="header-tabs" aria-label="页面">
        <RouterLink to="/" class="tab" :class="{ 'is-active': isHomeActive }">首页</RouterLink>
        <RouterLink to="/blog" class="tab" :class="{ 'is-active': isBlogActive }">博客</RouterLink>
        <RouterLink to="/notes" class="tab" :class="{ 'is-active': isNotesActive }">笔记</RouterLink>
      </nav>

      <div class="header-spacer" aria-hidden="true"></div>

      <ThemeToggle class="theme-slot" />

      <a
        class="round-btn gh-btn"
        href="https://github.com/lumenShen/"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="GitHub：lumenShen"
      >
        <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true">
          <path
            fill="currentColor"
            d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
          />
        </svg>
      </a>

      <a class="nav-cta" href="mailto:gozaoo@outlook.com">联系我</a>
    </div>
  </header>
</template>

<style scoped>
/* 层容器：fixed 自成 stacking context（z=100），本体不拦指针。
   左内边距随 --rail-offset（dock 展开时从 rail 右缘 + 24px 起步），三处消费
   同一变量同步过渡（§2.2）。 */
.header-layer {
  position: fixed;
  inset: 0 0 auto;
  z-index: var(--z-header);
  padding: var(--space-3) var(--space-5) 0;
  padding-left: calc(var(--rail-offset) + var(--space-5));
  pointer-events: none;
  transition: padding-left var(--dur-base) var(--ease-out-quart);
}

/* 模糊条带包裹层：left 随 rail 收展，dock 展开时条带从 rail 右缘起（§1.4）。
   显隐不走本层 opacity：opacity < 1 的祖先形成 backdrop root，层内
   backdrop-filter 的采样瞬间变空，模糊只会在过渡端点整块跳变（突变）——
   改为直接过渡各层 backdrop-filter 的 blur 值（目标值在 GradualBlur 内联样式）。 */
.header-blur-fade {
  position: absolute;
  top: 0;
  left: var(--rail-offset);
  right: 0;
  height: 5.5rem;
  pointer-events: none;
  transition: left var(--dur-base) var(--ease-out-quart);
}

.header-blur-fade :deep(.gradual-blur__layer) {
  transition:
    backdrop-filter var(--dur-base) ease-out,
    -webkit-backdrop-filter var(--dur-base) ease-out;
}

/* 幽灵态各层 blur 归零（!important 压过层内联目标值），悬浮态移除即长回目标值 */
.header-layer:not([data-scrolled='true']) .header-blur-fade :deep(.gradual-blur__layer) {
  backdrop-filter: blur(0rem) !important;
  -webkit-backdrop-filter: blur(0rem) !important;
}

/* 40px 中轴（移动 36px）：页头本体拦指针，位于条带之上（z=2 > 1） */
.header-row {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  height: 40px;
  pointer-events: auto;
}

/* ---- 圆形钮通用（菜单 / GitHub / 主题经 --theme-toggle-size 参与同一档） ---- */
.round-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--fg-1);
  cursor: pointer;
  transition:
    background-color var(--dur-fast) ease-out,
    color var(--dur-fast) ease-out,
    transform var(--dur-fast) ease-out;
}

.round-btn:hover {
  background: var(--tab-hover);
  color: var(--fg-0);
}

.round-btn:active {
  transform: scale(0.96);
}

/* ---- 品牌胶囊（§1.2）：幽灵态透明、悬浮态 chip-glass（base.css 公共类） ---- */
.brand-chip {
  display: inline-flex;
  align-items: center;
  flex: none;
  gap: var(--space-2);
  height: 40px;
  padding: 0 14px;
  border-radius: var(--radius-full);
  color: var(--fg-0);
  transition:
    background-color var(--dur-base) ease-out,
    border-color var(--dur-base) ease-out,
    box-shadow var(--dur-base) ease-out;
}

.brand-chip:hover {
  color: var(--fg-0);
}

.brand-mark {
  flex: none;
}

.brand-name {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 750;
  letter-spacing: -0.01em;
}

/* ---- 导航 tab（§1.2）：32px 高，左缘距品牌 12px（行 gap 8 + 4） ---- */
.header-tabs {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  margin-left: var(--space-1);
}

.tab {
  display: inline-flex;
  align-items: center;
  height: 32px;
  padding: 0 12px;
  border: 1px solid transparent;
  border-radius: var(--radius-full);
  color: var(--fg-1);
  font-size: 0.875rem;
  font-weight: 500;
  transition:
    background-color var(--dur-fast) ease-out,
    color var(--dur-fast) ease-out,
    border-color var(--dur-fast) ease-out;
}

.tab:hover {
  background: var(--tab-hover);
  color: var(--fg-0);
}

.tab.is-active {
  background: var(--accent-dim);
  border-color: var(--accent-line);
  color: var(--accent-strong);
}

.header-spacer {
  flex: 1;
}

/* ---- CTA「联系我」（§1.2）：实底主色，hover 加深 + 换 --on-accent-strong ---- */
.nav-cta {
  display: inline-flex;
  align-items: center;
  flex: none;
  height: 40px;
  padding: 0 16px;
  border-radius: var(--radius-full);
  background: var(--accent);
  color: var(--on-accent);
  font-size: 0.875rem;
  font-weight: 650;
  transition:
    background-color var(--dur-fast) ease-out,
    color var(--dur-fast) ease-out,
    transform var(--dur-fast) ease-out;
}

.nav-cta:hover {
  background: var(--accent-strong);
  color: var(--on-accent-strong);
}

.nav-cta:active {
  transform: scale(0.97);
}

/* ---- <640px（§1.6）：只留 菜单钮 / 品牌胶囊 / 主题钮，轴高 36px ---- */
@media (max-width: 639px) {
  .header-row,
  .brand-chip {
    height: 36px;
  }

  .round-btn {
    width: 36px;
    height: 36px;
  }

  /* 主题钮尺寸走 ThemeToggle 内部的 var()，不与之抢 width 声明 */
  .theme-slot {
    --theme-toggle-size: 36px;
  }

  .header-tabs,
  .gh-btn,
  .nav-cta {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .header-layer,
  .header-blur-fade,
  .header-blur-fade :deep(.gradual-blur__layer),
  .round-btn,
  .brand-chip,
  .tab,
  .nav-cta {
    transition: none;
  }
}
</style>
