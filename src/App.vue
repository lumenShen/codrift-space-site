<script setup lang="ts">
/*
 * 应用外壳（页面模块总装）——五层挂载点（契约 §0 层级表 + V2 rail 行，DESIGN-V2 §1.5）：
 *
 *   背景层  --z-bg-layer(0)   全站弱化版 PixelTrail；首页叠加 GhostCursor。
 *                             两层均 pointer-events:none（§3.8）。上游 PixelTrail 监听
 *                             自身容器、GhostCursor 监听父元素（research/vue-bits
 *                             PixelTrail.vue:284 / GhostCursor.vue:436），而本层收不到
 *                             真实指针事件 —— 因此在 window 上旁听 pointermove，
 *                             以合成事件转发进本层，两种监听实现都能拿到坐标。
 *                             光标离开窗口（documentElement mouseleave）时合成
 *                             pointerleave。reduced-motion 下两层不挂载（§6.3）。
 *   内容层  --z-content(10)   router-view（.page-col 限宽 1080）与页脚。
 *   页头层  --z-header(100)   SiteHeader（GradualBlur 条带 z1 + 单点对齐小元件 z2）。
 *   按钮层  --z-fab(200)      FloatingActions（GlassButton：回到顶部 / 联系我）。
 *   rail 层 --z-rail(400)     RouterRail overlay（scrim z1 + 面板 z2；dock 态为
 *                             普通停靠左栏），高于 FAB、低于光标。
 *   光标层  --z-cursor(9999)  TargetCursor 全局启用；层本身 pointer-events:none。
 *
 * rail 状态（DESIGN-V2 §2）提升在此：dock 收展（rail-collapsed，持久化
 * localStorage['codrift.rail.collapsed']）与 overlay 开合（<1024px 抽屉）。
 * --rail-offset 由 .app-shell 的 class 与断点驱动，页头左距 / 模糊条带 left /
 * 内容与页脚左距三处消费同一变量（§2.2）。overlay 开启时底层内容包在 .page-shift
 * 里右移缩退、露圆角（§2.3），页头与 page-shift 绑 inert（§2.5）。
 *
 * 路由切换滚动回顶由 router 的 scrollBehavior 负责（src/router/index.ts）。
 */
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { GhostCursor, PixelTrail, TargetCursor } from '@/effects';
import AuroraBackdrop from '@/components/AuroraBackdrop.vue';
import SiteHeader from '@/components/SiteHeader.vue';
import SiteFooter from '@/components/SiteFooter.vue';
import FloatingActions from '@/components/FloatingActions.vue';
import RouterRail from '@/components/RouterRail.vue';
import { useMediaQuery } from '@/composables/useMediaQuery';
import { ensureExtendComponentsRegistered } from '@/components/content';

ensureExtendComponentsRegistered();

const route = useRoute();
const isHome = computed(() => route.name === 'home');

/* 动效组件的 color prop 走设计令牌：运行时读一次 --accent（three 不识别 CSS 变量）。
   两主题 --accent 同值（#4f8cff），切主题无需重读；若未来引入随主题变化的动效主色，
   这里必须改成 watch(useTheme().theme)（DESIGN-V2 §3.7）。 */
const accentColor =
  (typeof window !== 'undefined'
    ? getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()
    : '') || '#4f8cff';

/* ---- rail 状态（§2.2/§2.3） ---- */
const railDocked = useMediaQuery('(min-width: 1024px)');

const RAIL_COLLAPSED_KEY = 'codrift.rail.collapsed';

function readRailCollapsed(): boolean {
  try {
    return localStorage.getItem(RAIL_COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
}

/** dock 收展：初始化若为 true 则首渲染直挂 class，免动画（§2.2） */
const railCollapsed = ref(readRailCollapsed());
const railOverlayOpen = ref(false);

function toggleRail(): void {
  if (railDocked.value) {
    railCollapsed.value = !railCollapsed.value;
    try {
      localStorage.setItem(RAIL_COLLAPSED_KEY, String(railCollapsed.value));
    } catch {
      /* 存储不可用：本次会话内仍生效，只是不持久化 */
    }
  } else {
    railOverlayOpen.value = !railOverlayOpen.value;
  }
}

/* 跨断点（1024px）：overlay 开着升到 dock → 自动关、清 inert/滚动锁/transform（§2.3） */
watch(railDocked, (docked) => {
  if (docked && railOverlayOpen.value) railOverlayOpen.value = false;
});

/* overlay 关闭 → 移除 inert 后焦点归还页头菜单钮（§2.5） */
const headerRef = ref<InstanceType<typeof SiteHeader> | null>(null);

watch(railOverlayOpen, async (open, wasOpen) => {
  if (!open && wasOpen) {
    await nextTick();
    headerRef.value?.focusMenuButton();
  }
});

/* reduced-motion：PixelTrail/GhostCursor 不挂载（§6.3，比静止更省） */
const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

/* ---- 背景层指针事件转发（见头部注释） ---- */
const bgLayer = ref<HTMLDivElement | null>(null);
let forwardStarted = false;

function forwardPointer(e: PointerEvent): void {
  const layer = bgLayer.value;
  if (!layer) return;
  const init: PointerEventInit = { clientX: e.clientX, clientY: e.clientY };
  if (!forwardStarted) {
    forwardStarted = true;
    layer.dispatchEvent(new PointerEvent('pointerenter', init));
  }
  layer.dispatchEvent(new PointerEvent('pointermove', init));
  for (const child of layer.children) {
    child.dispatchEvent(new PointerEvent('pointermove', init));
  }
}

/* 光标离开窗口：复位转发标记，下次回来重新合成 pointerenter */
function forwardPointerLeave(): void {
  if (!forwardStarted) return;
  forwardStarted = false;
  const layer = bgLayer.value;
  if (!layer) return;
  layer.dispatchEvent(new PointerEvent('pointerleave'));
  for (const child of layer.children) {
    child.dispatchEvent(new PointerEvent('pointerleave'));
  }
}

onMounted(() => {
  window.addEventListener('pointermove', forwardPointer, { passive: true });
  document.documentElement.addEventListener('mouseleave', forwardPointerLeave);
});
onUnmounted(() => {
  window.removeEventListener('pointermove', forwardPointer);
  document.documentElement.removeEventListener('mouseleave', forwardPointerLeave);
});
</script>

<template>
  <div class="app-shell" :class="{ 'rail-collapsed': railCollapsed }">
    <!-- 动效层挂载点：背景层 BackgroundLayer（z-index: var(--z-bg-layer)，固定全屏） -->
    <div ref="bgLayer" class="bg-layer" aria-hidden="true">
      <!-- 极光光带（重设计的背景世界；纯 CSS，reduced-motion 下静止） -->
      <AuroraBackdrop class="bg-fx" />
      <!-- 弱化版 PixelTrail（上游默认 gridSize 40 / trailSize 0.1 / maxAge 250） -->
      <PixelTrail
        v-if="!reducedMotion"
        class="bg-fx"
        :grid-size="64"
        :trail-size="0.07"
        :max-age="140"
        :interpolate="5"
        :color="accentColor"
      />
      <!-- GhostCursor 仅首页挂载（three + bloom，离开页面即卸载）；
           brightness/bloom/DPR 为色值增强用法参数（组件默认值仍守契约 §3.2） -->
      <GhostCursor
        v-if="isHome && !reducedMotion"
        class="bg-fx"
        :color="accentColor"
        :brightness="1.35"
        :bloom-strength="0.35"
        :bloom-radius="1.2"
        :max-device-pixel-ratio="0.75"
      />
    </div>

    <!-- 动效层挂载点：光标层 CursorLayer（z-index: var(--z-cursor)） -->
    <div class="cursor-layer" aria-hidden="true">
      <TargetCursor target-selector='[data-cursor="target"], a, button' />
    </div>

    <!-- 动效层挂载点：悬浮页头 FloatingHeader（z-index: var(--z-header)）；
         overlay 抽屉开启时整层 inert（§2.5） -->
    <SiteHeader
      ref="headerRef"
      :rail-collapsed="railCollapsed"
      :overlay-open="railOverlayOpen"
      :rail-docked="railDocked"
      :inert="railOverlayOpen"
      @toggle-rail="toggleRail"
    />

    <!-- 底层内容：overlay 开启时右移缩退、右缘露圆角（§2.3），inert 防焦点逃逸 -->
    <div class="page-shift" :class="{ 'is-shifted': railOverlayOpen }" :inert="railOverlayOpen">
      <div class="app-main">
        <div class="page-col">
          <router-view />
        </div>
      </div>

      <div class="footer-shift">
        <SiteFooter />
      </div>
    </div>

    <!-- router-rail（dock 停靠 / overlay 抽屉，状态经 props/emits 收发） -->
    <RouterRail
      :docked="railDocked"
      :collapsed="railCollapsed"
      :overlay-open="railOverlayOpen"
      @update:overlay-open="railOverlayOpen = $event"
    />

    <!-- 动效层挂载点：悬浮按钮 FloatingButton（z-index: var(--z-fab)） -->
    <FloatingActions />
  </div>
</template>

<style scoped>
.app-shell {
  position: relative;
  min-height: 100vh;
  isolation: isolate;
  /* --rail-offset：运行时布局变量（§0.5/§2.2）。dock 且展开 = 264px，其余恒 0px；
     页头左距 / 模糊条带 left / 内容左距三处消费同一变量，随同一 class 同步过渡。 */
  --rail-offset: 0px;
}

@media (min-width: 1024px) {
  .app-shell:not(.rail-collapsed) {
    --rail-offset: var(--rail-w);
  }
}

/* 背景层：固定全屏、不拦截指针；效果组件经转发事件驱动 */
.bg-layer {
  position: fixed;
  inset: 0;
  z-index: var(--z-bg-layer);
  pointer-events: none;
}

.bg-fx {
  width: 100%;
  height: 100%;
}

/* 光标层：永远最上、不拦截指针 */
.cursor-layer {
  position: fixed;
  inset: 0;
  z-index: var(--z-cursor);
  pointer-events: none;
}

/* 底层内容容器：overlay 开启时右移缩退、露圆角（Kimi 抽屉签名动效，§2.3）；
   bg-layer / 页头 / FAB / rail 不参与位移。will-change 仅打开期间挂。 */
.page-shift {
  transform-origin: left center;
  transition: transform var(--dur-base) var(--ease-drawer);
}

.page-shift.is-shifted {
  transform: translateX(calc(var(--rail-overlay-w) * 0.9)) scale(0.96);
  border-radius: 0 24px 24px 0;
  overflow: hidden;
  will-change: transform;
  transition: transform var(--dur-slow) var(--ease-drawer);
}

/* 内容层：左距随 --rail-offset 让位给 dock rail；限宽从 .app-main 迁入 .page-col */
.app-main {
  position: relative;
  z-index: var(--z-content);
  padding: calc(var(--space-8) + var(--space-7)) var(--space-5) 0;
  padding-left: calc(var(--rail-offset) + var(--space-5));
  transition: padding-left var(--dur-base) var(--ease-out-quart);
}

.page-col {
  max-width: 1080px;
  margin-inline: auto;
}

/* 页脚与内容共用同一偏移：dock 展开时页脚中心与 .page-col 中心精确对齐
   （SiteFooter 自身不可改，包裹层只加左距，overlay 态变量为 0 无副作用） */
.footer-shift {
  padding-left: var(--rail-offset);
  transition: padding-left var(--dur-base) var(--ease-out-quart);
}

@media (prefers-reduced-motion: reduce) {
  .page-shift,
  .app-main,
  .footer-shift {
    transition: none;
  }
}
</style>
