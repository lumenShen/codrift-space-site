<script setup lang="ts">
/**
 * 十字准星光标 —— 中心白点 + 4 个 L 形角括号；空闲整体慢速自旋，
 * 指针到达目标元素（targetSelector 匹配者，嵌套时最内层胜出）时角括号飞出吸附到
 * 目标四角（可选 parallax 跟随），离开复位并恢复自旋。
 * 上游：vue-bits TargetCursor（MIT），本地副本 research/vue-bits/TargetCursor.vue；
 * props 按 docs/CONTRACTS.md §3.4 全量保留，无裁剪。
 *
 * 【TODO-A 取舍：不引入 gsap（契约 §3.9 选项 2，WAAPI/CSS/rAF 重写）】
 *   - 跟随与角括号吸附/回位 → 自绘 rAF：指针位置指数平滑（对齐上游每次 mousemove
 *     gsap.to(duration 0.1, power3.out) 的 retarget 手感），角括号按
 *     strength(hoverDuration 内 easeOutCubic 渐入) × 帧平滑系数追踪
 *     (target四角 − 准星位置)，parallaxOn=false 时逐帧锁死（对齐上游 duration 0）；
 *   - 空闲自旋 → CSS animation（linear infinite）。上游进入悬停即 gsap.set(rotation 0)
 *     并暂停 timeline、离开 50ms 后从归一化角度重启 —— 等价实现：hover 期间
 *     animation:none 复位到 0°，离开移除类后动画从 0% 重启（悬停期间旋转本就停在 0）；
 *   - 按下/抬起缩放（dot 0.7 / 整体 0.9）→ CSS transition + is-down 类。
 *   rAF 循环只在需要时运转（跟随收敛 / 悬停追踪 / 回位补间完成即停），空闲零开销。
 *
 * 【hideDefaultCursor 在本仓为受控降级】上游直接改写 document.body.style.cursor='none'
 *   （research 笔记要点 ④：组件必须常驻否则用户没光标）。本仓约束「组件不直接改全局
 *   body 样式」，该 prop 保留签名但不隐藏系统光标 —— 准星与原生光标并存，
 *   同时规避「组件卸载失败用户没光标」的故障模式。要隐藏原生光标请由页面层决定。
 *
 * 降级策略：
 *  - prefers-reduced-motion: reduce → 不渲染、不注册任何监听（§3.8 光标类），
 *    media query 变化实时启停；
 *  - 触屏 + 窄屏 或移动端 UA（上游 isMobile 判定）→ 不渲染、不监听；
 *  - 上游 Tailwind 任意值类（z-[9999]/border-[3px]/-translate-x-[150%] 等）改写 scoped
 *    CSS：角括号静息偏移用独立 transform 属性 translate（与上游 Tailwind v4 的
 *    translate 工具类同机制），飞行偏移写 inline transform —— 两者按规范叠加。
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

interface TargetCursorProps {
  targetSelector?: string;
  spinDuration?: number;
  hideDefaultCursor?: boolean;
  hoverDuration?: number;
  parallaxOn?: boolean;
}

const props = withDefaults(defineProps<TargetCursorProps>(), {
  targetSelector: '.cursor-target',
  spinDuration: 2,
  hideDefaultCursor: true,
  hoverDuration: 0.2,
  parallaxOn: true
});

/** 布局常量（上游 constants，research 副本 :45-48） */
const CORNER_SIZE = 12;
const BORDER_WIDTH = 3;

/** 角括号静息偏移（上游 Tailwind -translate-x-[150%] 等换算成 px；leave 回位终点） */
const REST_OFFSETS: ReadonlyArray<Readonly<{ x: number; y: number }>> = [
  { x: -CORNER_SIZE * 1.5, y: -CORNER_SIZE * 1.5 },
  { x: CORNER_SIZE * 0.5, y: -CORNER_SIZE * 1.5 },
  { x: CORNER_SIZE * 0.5, y: CORNER_SIZE * 0.5 },
  { x: -CORNER_SIZE * 1.5, y: CORNER_SIZE * 0.5 }
];

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

const cursorRef = ref<HTMLDivElement | null>(null);

const reducedMotion = ref(false);
/** 触屏/窄屏/移动端 UA 不启用（上游 isMobile，:32-43） */
const touchDevice = ref(false);
const active = computed(() => !touchDevice.value && !reducedMotion.value);
const hovering = ref(false);
const isDown = ref(false);

let corners: HTMLDivElement[] = [];
let rafId: number | null = null;
let lastTime = 0;

// 跟随状态：pos 为准星当前位（也是角括号坐标系的基准），targetPos 为指针位
const pos = { x: 0, y: 0 };
const targetPos = { x: 0, y: 0 };

// 悬停状态
let activeTarget: Element | null = null;
let currentLeaveHandler: (() => void) | null = null;
let hoverStart = 0;
/** 吸附终点（视口坐标），随目标 rect 与准星位置逐帧换算 */
const cornerTargets: Array<{ x: number; y: number } | null> = [null, null, null, null];
/** 角括号当前飞行偏移（相对准星中心，px） */
const cornerPos: Array<{ x: number; y: number }> = [];
/** 离开后的回位补间状态 */
let returning = false;
let returnStart = 0;
const returnFrom: Array<{ x: number; y: number }> = [];

/* ---------- rAF 循环：跟随 + 悬停追踪 + 回位补间 ---------- */

function tick(now: number): void {
  rafId = null;
  const cursor = cursorRef.value;
  if (!cursor) return;

  const dt = Math.min(Math.max((now - lastTime) / 1000, 0), 0.1);
  lastTime = now;

  // 1) 准星跟随：指数平滑（对齐上游 0.1s power3.out retarget 手感）
  const followAlpha = 1 - Math.exp(-dt / 0.05);
  pos.x += (targetPos.x - pos.x) * followAlpha;
  pos.y += (targetPos.y - pos.y) * followAlpha;
  cursor.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;

  // 2) 悬停：角括号追踪目标四角（视口坐标 → 准星相对坐标）
  if (hovering.value && activeTarget) {
    const t = Math.min(1, (now - hoverStart) / Math.max(1, props.hoverDuration * 1000));
    const strength = easeOutCubic(t);
    // parallaxOn：以 ~0.1s 时间常数追逐（上游 ticker 里 0.2s tween 每帧重定向的手感）；
    // 关闭时逐帧锁死（上游 duration 0）
    const tau = props.parallaxOn ? 0.1 : 0.001;
    const alpha = 1 - Math.exp(-dt / tau);
    for (let i = 0; i < 4; i++) {
      const ct = cornerTargets[i];
      const cp = cornerPos[i];
      const corner = corners[i];
      if (!ct || !cp || !corner) continue;
      const desiredX = ct.x - pos.x;
      const desiredY = ct.y - pos.y;
      const f = strength * alpha;
      cp.x += (desiredX - cp.x) * f;
      cp.y += (desiredY - cp.y) * f;
      corner.style.transform = `translate3d(${cp.x}px, ${cp.y}px, 0)`;
    }
    rafId = requestAnimationFrame(tick); // 悬停期间持续追踪，不停摆
    return;
  }

  // 3) 回位补间（上游 leave timeline：0.3s power3.out 回静息偏移）
  if (returning) {
    const t = Math.min(1, (now - returnStart) / 300);
    const e = easeOutCubic(t);
    for (let i = 0; i < 4; i++) {
      const from = returnFrom[i];
      const rest = REST_OFFSETS[i];
      const cp = cornerPos[i];
      const corner = corners[i];
      if (!from || !rest || !cp || !corner) continue;
      const x = from.x + (rest.x - from.x) * e;
      const y = from.y + (rest.y - from.y) * e;
      cp.x = x;
      cp.y = y;
      corner.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }
    if (t < 1) {
      rafId = requestAnimationFrame(tick);
      return;
    }
    returning = false;
    for (const corner of corners) corner.style.transform = ''; // 回到 CSS 静息偏移
    return;
  }

  // 4) 跟随收敛 → 停摆（rafId 已置 null，下一帧不再排）
  const dx = targetPos.x - pos.x;
  const dy = targetPos.y - pos.y;
  if (dx * dx + dy * dy < 0.01) {
    pos.x = targetPos.x;
    pos.y = targetPos.y;
    cursor.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
    return;
  }
  rafId = requestAnimationFrame(tick);
}

function ensureLoop(): void {
  if (rafId !== null) return;
  lastTime = performance.now();
  rafId = requestAnimationFrame(tick);
}

/* ---------- window 级监听（与上游同一套事件拓扑：mousemove/mouseover/scroll/
   mousedown/mouseup，scroll passive；mousedown/up 不悬停也响应） ---------- */

function onMove(e: MouseEvent): void {
  targetPos.x = e.clientX;
  targetPos.y = e.clientY;
  ensureLoop();
}

function onEnter(e: MouseEvent): void {
  const cursor = cursorRef.value;
  if (!cursor || !corners.length) return;

  // 嵌套目标：沿祖先链向上取最内层匹配（上游 :195-208）
  let target: Element | null = null;
  let current: Element | null = e.target as Element | null;
  while (current && current !== document.body) {
    if (current.matches(props.targetSelector)) {
      target = current;
      break;
    }
    current = current.parentElement;
  }
  if (!target || target === activeTarget) return;

  // 目标切换：摘掉旧目标的 leave 监听（不播回位动画，直接改吸新目标，同上游）
  if (activeTarget && currentLeaveHandler) {
    activeTarget.removeEventListener('mouseleave', currentLeaveHandler);
  }
  currentLeaveHandler = null;
  activeTarget = target;
  hovering.value = true;
  hoverStart = performance.now();
  returning = false;

  // 目标四角（视口坐标）：外扩 borderWidth、内收 cornerSize（上游 :233-255）
  const rect = target.getBoundingClientRect();
  cornerTargets[0] = { x: rect.left - BORDER_WIDTH, y: rect.top - BORDER_WIDTH };
  cornerTargets[1] = { x: rect.right + BORDER_WIDTH - CORNER_SIZE, y: rect.top - BORDER_WIDTH };
  cornerTargets[2] = {
    x: rect.right + BORDER_WIDTH - CORNER_SIZE,
    y: rect.bottom + BORDER_WIDTH - CORNER_SIZE
  };
  cornerTargets[3] = { x: rect.left - BORDER_WIDTH, y: rect.bottom + BORDER_WIDTH - CORNER_SIZE };

  currentLeaveHandler = onLeave;
  target.addEventListener('mouseleave', onLeave);

  ensureLoop();
}

function onLeave(): void {
  if (activeTarget && currentLeaveHandler) {
    activeTarget.removeEventListener('mouseleave', currentLeaveHandler);
  }
  currentLeaveHandler = null;
  activeTarget = null;
  hovering.value = false; // 移除 is-hovering → 自旋动画恢复（从 0° 起，无跳变）

  // 角括号飞回静息位
  returning = true;
  returnStart = performance.now();
  for (let i = 0; i < 4; i++) {
    returnFrom[i] = { x: cornerPos[i]!.x, y: cornerPos[i]!.y };
    cornerTargets[i] = null;
  }
  ensureLoop();
}

function onScroll(): void {
  if (!activeTarget) return;
  // 指针下元素不再是目标（如滚动后）→ 复位（上游 :146-160）
  const under = document.elementFromPoint(pos.x, pos.y);
  const still =
    under && (under === activeTarget || under.closest(props.targetSelector) === activeTarget);
  if (!still) onLeave();
}

function onDown(): void {
  isDown.value = true;
}

function onUp(): void {
  isDown.value = false;
}

/* ---------- 挂载 / 拆除 ---------- */

function isTouchLike(): boolean {
  if (typeof window === 'undefined') return true;
  const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth <= 768;
  const userAgent = navigator.userAgent || '';
  const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
  return (hasTouchScreen && isSmallScreen) || mobileRegex.test(userAgent.toLowerCase());
}

function setup(): void {
  const cursor = cursorRef.value;
  if (!cursor) return;

  corners = Array.from(cursor.querySelectorAll<HTMLDivElement>('.tcursor__corner'));
  cornerPos.length = 0;
  for (let i = 0; i < 4; i++) {
    cornerPos.push({ x: REST_OFFSETS[i]!.x, y: REST_OFFSETS[i]!.y });
  }

  // 初始停在视口中心（上游 gsap.set x/y = innerWidth/2）
  pos.x = targetPos.x = window.innerWidth / 2;
  pos.y = targetPos.y = window.innerHeight / 2;
  cursor.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;

  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseover', onEnter);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('mousedown', onDown);
  window.addEventListener('mouseup', onUp);
}

function teardown(): void {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  window.removeEventListener('mousemove', onMove);
  window.removeEventListener('mouseover', onEnter);
  window.removeEventListener('scroll', onScroll);
  window.removeEventListener('mousedown', onDown);
  window.removeEventListener('mouseup', onUp);
  if (activeTarget && currentLeaveHandler) {
    activeTarget.removeEventListener('mouseleave', currentLeaveHandler);
  }
  currentLeaveHandler = null;
  activeTarget = null;
  hovering.value = false;
  isDown.value = false;
  returning = false;
  corners = [];
}

let motionMq: MediaQueryList | null = null;
const onMotionChange = (e: MediaQueryListEvent) => {
  reducedMotion.value = e.matches;
};

onMounted(() => {
  touchDevice.value = isTouchLike();
  if (typeof window.matchMedia === 'function') {
    motionMq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotion.value = motionMq.matches;
    motionMq.addEventListener('change', onMotionChange);
  }
  // 首次挂载即激活（active 初始为 true、值不再变化）时，下方 watch 不会触发，
  // setup() 将永不执行、准星僵死——须在此处主动挂一次（验收缺陷 2026-10-24）。
  // 注意必须在 touchDevice/reducedMotion 落定之后判断：触屏或减弱动效时
  // active 为 false，v-if 不渲染、这里也不注册监听（§3.8）。
  if (active.value) setup();
});

onBeforeUnmount(() => {
  motionMq?.removeEventListener('change', onMotionChange);
  motionMq = null;
  teardown();
});

// active 翻转（含减弱动效实时开关）：等 v-if 渲染完再挂/拆
watch(
  active,
  value => {
    teardown();
    if (value) void nextTick(setup);
  },
  { flush: 'post' }
);

// props 变化整组重建（上游 :395-401；运行时别频繁改 props）
watch(
  () => [props.targetSelector, props.spinDuration, props.hideDefaultCursor, props.hoverDuration, props.parallaxOn],
  () => {
    if (!active.value) return;
    teardown();
    void nextTick(setup);
  },
  { flush: 'post' }
);
</script>

<template>
  <!-- 触屏 / 减弱动效：整层不渲染，监听也不注册 -->
  <div
    v-if="active"
    ref="cursorRef"
    class="tcursor"
    :class="{ 'is-hovering': hovering, 'is-down': isDown }"
  >
    <!-- 内层承担自旋（CSS animation，时长来自 spinDuration prop）与按下缩放；
         外层 transform 专用于跟随位移，两层互不打架 -->
    <div class="tcursor__spin" :style="{ animationDuration: `${props.spinDuration}s` }">
      <div class="tcursor__dot" />
      <div class="tcursor__corner tcursor__corner--tl" />
      <div class="tcursor__corner tcursor__corner--tr" />
      <div class="tcursor__corner tcursor__corner--br" />
      <div class="tcursor__corner tcursor__corner--bl" />
    </div>
  </div>
</template>

<style scoped>
/* 上游 Tailwind：top-0 left-0 z-[9999] fixed w-0 h-0 pointer-events-none */
.tcursor {
  position: fixed;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  z-index: var(--z-cursor, 9999);
  pointer-events: none;
  will-change: transform;
}

/* 空闲自旋（上游 spinTimeline rotation +=360 / spinDuration / linear / 无限）。
   is-hovering 时 animation:none 复位到 0°（上游 gsap.set rotation 0 + 暂停 timeline）；
   is-down 时整体缩到 0.9（上游 gsap.to scale 0.9, 0.2s）。 */
.tcursor__spin {
  animation: tcursor-spin linear infinite;
  transition: scale 0.2s ease-out;
  will-change: transform;
}

@keyframes tcursor-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.is-hovering .tcursor__spin {
  animation: none;
}

.is-down .tcursor__spin {
  scale: 0.9;
}

/* 上游：bg-white rounded-full w-1 h-1 居中；按下缩到 0.7（0.3s） */
.tcursor__dot {
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 4px;
  border-radius: 9999px;
  background: var(--tcursor-color, var(--fg-0));
  transform: translate(-50%, -50%);
  transition: transform 0.3s ease-out;
  will-change: transform;
}

.is-down .tcursor__dot {
  transform: translate(-50%, -50%) scale(0.7);
}

/* 上游：border-[3px] border-white w-3 h-3 + 各角缺两条边 + translate 类定位。
   静息偏移走独立 transform 属性 translate（--rest-*），飞行偏移由脚本写 inline
   transform，两者按规范叠加 —— 与上游 Tailwind v4 + gsap 的组合机制一致。 */
.tcursor__corner {
  position: absolute;
  top: 0;
  left: 0;
  width: 12px;
  height: 12px;
  border: 3px solid var(--tcursor-color, var(--fg-0));
  translate: var(--rest-x) var(--rest-y);
  will-change: transform;
}

.tcursor__corner--tl {
  border-right: none;
  border-bottom: none;
  --rest-x: -18px;
  --rest-y: -18px;
}

.tcursor__corner--tr {
  border-left: none;
  border-bottom: none;
  --rest-x: 6px;
  --rest-y: -18px;
}

.tcursor__corner--br {
  border-left: none;
  border-top: none;
  --rest-x: 6px;
  --rest-y: 6px;
}

.tcursor__corner--bl {
  border-right: none;
  border-top: none;
  --rest-x: -18px;
  --rest-y: 6px;
}
</style>
