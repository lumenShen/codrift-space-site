<script setup lang="ts">
/**
 * FeatureTag —— 身份行内联特色 TAG（改造自 vue-bits Stack，上游源码存档
 * research/vue-bits/Stack.vue）。视觉对标 kexie.space 的「硬件部」胶囊：
 * 点题橙实底 + 深色文字 + 圆角胶囊，内联在文字流中、高度与身份行文字匹配。
 *
 * 与上游 Stack 的差异（改造，不是照搬）：
 *  - 上游是大卡层叠（motion-v Motion 拖拽 + sendToBackOnClick + autoplay，
 *    Stack.vue:8-79,222-237,241-256）；本组件收进 tag 尺寸：单胶囊为交互
 *    主体，身后两枚静态壳层表达景深（kexie dept-deck「后卡更糊更暗」的暗语，
 *    位移缩到 ±0.2~0.3em、blur 1~1.8px、brightness 0.72/0.5）；
 *    无 prev/next、无指示点（.fs-controls 类控制条按规格移除）；
 *  - 换场走站长管线：文字时间轴由 SwapText 承载（旧内容 0s/0.3s 渐出+模糊
 *    增大后卸载；新内容 0.2s/0.3s 渐入+模糊减小；全程 0.5s 内完成）；toss
 *    模式下旧层同时被「甩回」：spring 微超伸（SPRING_SNAPPY，kexie 调研校准
 *    的更弹一档 k=480/c=27/m=1：ζ≈0.616、仿真过冲 ≈7.6%、≈179ms 到峰）——
 *    轻微向上 5px + 随机水平偏移 ±8px，scale 注入 -2.8/s 初速走出 1→≈0.94→1
 *    （仿真谷值 0.9434@50ms）；模糊随渐出增大到 6px，即 kexie 式「运动模糊感」；
 *  - 拖拽几何参考上游 Stack.vue（drag elastic 0.6 + 超阈值 sendToBack，
 *    Stack.vue:20-23,222-228），阈值按 tag 尺寸缩放：0.35×胶囊实测宽
 *    （夹 28~72px；上游 200px/约 300px 卡），弹性跟随 0.4；粗指针（触屏）
 *    只点击切换（上游 mobileClickOnly 同思路，不劫持页面滚动）；
 *  - 自动轮播约 5s：悬停/拖拽/聚焦中暂停、页面隐藏暂停、手动切换重置计时；
 *    prefers-reduced-motion 停用自动轮播（弹簧由 useSpring 自动退化为瞬时切换）；
 *  - 受控组件：activeId 由页面持有（Describe 行与 TAG 同步换场共用同一状态），
 *    本组件只发 update:activeId，不私改状态。
 */
import { computed, onBeforeUnmount, onMounted, ref, watch, type CSSProperties } from 'vue';
import { reducedMotion, SPRING_SNAPPY, SpringValue } from '@/effects/useSpring';
import SwapText from './SwapText.vue';

export interface FeatureTagItem {
  id: string;
  label: string;
}

const props = withDefaults(
  defineProps<{
    /** 特色条目（标签定稿：前端审美/效率至上/产品产出/运动交流/音乐爱好） */
    items: FeatureTagItem[];
    /** 当前特色 id（页面持有，与 Describe 行共用） */
    activeId: string;
    /** 自动轮播间隔（约 5s 规格值） */
    intervalMs?: number;
  }>(),
  { intervalMs: 5000 },
);

const emit = defineEmits<{ 'update:activeId': [id: string] }>();

function resolveItem(key: string | number): FeatureTagItem {
  return props.items.find((i) => i.id === key) ?? props.items[0];
}

const activeLabel = computed(() => resolveItem(props.activeId)?.label ?? '');

/* ---- 切换（上游 sendToBack 语义：当前项甩回，下一项到前） ---- */
function advance(): void {
  if (props.items.length < 2) return;
  const idx = props.items.findIndex((i) => i.id === props.activeId);
  const next = props.items[(idx + 1) % props.items.length];
  emit('update:activeId', next.id);
  restartAutoplay(); // 手动/拖拽切换重置 5s 计时
}

/* ---- 拖拽（参考上游 Stack.vue 拖动几何，阈值按 tag 尺寸缩放） ----
   拖拽偏移用弹簧承载：拖动中 set() 直接跟手（不打架），松手 setTarget(0)
   弹簧带劲回位（超阈值同样回位——换场动效由 SwapText toss 层承担）。 */
const DRAG_ELASTIC = 0.4; // 弹性跟随（上游 drag-elastic 0.6 的 tag 缩比）
const DRAG_RATIO = 0.35; // 阈值 = 0.35 × 胶囊实测宽（上游 200px/≈300px 卡）
const DRAG_DEAD_ZONE = 4; // 位移超过此值才算拖拽手势（抑制误触 click）

const dragX = new SpringValue(0, SPRING_SNAPPY, 0.1);
const dragY = new SpringValue(0, SPRING_SNAPPY, 0.1);
const dragOffset = ref({ x: 0, y: 0 });
dragX.onUpdate = () => {
  dragOffset.value = { x: dragX.value, y: dragY.value };
};
dragY.onUpdate = () => {
  dragOffset.value = { x: dragX.value, y: dragY.value };
};

const btnRef = ref<HTMLElement | null>(null);
const isDragging = ref(false); // 按压/拖拽进行中（自动轮播暂停 + 光标态）
let pointerId: number | null = null;
let startX = 0;
let startY = 0;
let moved = false; // 本次按压是否已成拖拽手势（click 抑制）
let threshold = 42;

function onPointerDown(e: PointerEvent): void {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  // 粗指针（触屏）：只点击切换，不劫持滚动（上游 mobileClickOnly 思路）
  if (
    typeof window.matchMedia === 'function' &&
    !window.matchMedia('(pointer: fine)').matches
  ) {
    return;
  }
  const root = e.currentTarget as HTMLElement | null;
  if (!root) return;
  pointerId = e.pointerId;
  startX = e.clientX;
  startY = e.clientY;
  moved = false;
  isDragging.value = true;
  const w = btnRef.value?.getBoundingClientRect().width ?? 0;
  threshold = Math.min(72, Math.max(28, w * DRAG_RATIO));
  root.setPointerCapture(e.pointerId);
}

function onPointerMove(e: PointerEvent): void {
  if (pointerId !== e.pointerId) return;
  const dx = e.clientX - startX;
  const dy = e.clientY - startY;
  if (!moved && Math.hypot(dx, dy) > DRAG_DEAD_ZONE) moved = true;
  dragX.set(dx * DRAG_ELASTIC);
  dragY.set(dy * DRAG_ELASTIC);
}

function endDrag(e: PointerEvent | null): void {
  if (e && pointerId !== e.pointerId) return;
  pointerId = null;
  isDragging.value = false;
  if (e) {
    const rawX = e.clientX - startX;
    const rawY = e.clientY - startY;
    // 上游 Stack.vue:222-228：|offset| 超阈值 → sendToBack（此处 = advance）
    if (moved && (Math.abs(rawX) > threshold || Math.abs(rawY) > threshold)) advance();
  }
  dragX.setTarget(0);
  dragY.setTarget(0);
}

function onPointerUp(e: PointerEvent): void {
  endDrag(e);
}

function onPointerCancel(): void {
  moved = false;
  endDrag(null);
}

function onClick(): void {
  if (moved) {
    moved = false; // 拖拽松手后的合成 click 不当点击
    return;
  }
  advance();
}

const dragStyle = computed<CSSProperties>(() => ({
  transform: `translate3d(${dragOffset.value.x.toFixed(2)}px, ${dragOffset.value.y.toFixed(2)}px, 0)`,
}));

/* ---- 自动轮播（约 5s；悬停/拖拽/聚焦中暂停，页面隐藏暂停） ---- */
const hovered = ref(false);
const canRun = computed(
  () => !hovered.value && !isDragging.value && !reducedMotion.value,
);

let timer: ReturnType<typeof setInterval> | undefined;

function stopAutoplay(): void {
  if (timer) {
    clearInterval(timer);
    timer = undefined;
  }
}

function restartAutoplay(): void {
  stopAutoplay();
  if (!canRun.value || props.items.length < 2) return;
  timer = setInterval(() => advance(), props.intervalMs);
}

watch(canRun, restartAutoplay);

function onVisibility(): void {
  if (document.hidden) stopAutoplay();
  else restartAutoplay();
}

onMounted(() => {
  restartAutoplay();
  document.addEventListener('visibilitychange', onVisibility);
});

onBeforeUnmount(() => {
  stopAutoplay();
  document.removeEventListener('visibilitychange', onVisibility);
});
</script>

<template>
  <span
    class="ft"
    role="group"
    aria-roledescription="轮播"
    aria-label="站点特色"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
    @focusin="hovered = true"
    @focusout="hovered = false"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
  >
    <!-- 景深壳层：kexie dept-deck 的「后卡更糊更暗」，静态、不参与交互 -->
    <span class="ft-shell ft-shell--a" aria-hidden="true"></span>
    <span class="ft-shell ft-shell--b" aria-hidden="true"></span>

    <button
      ref="btnRef"
      type="button"
      class="ft-btn"
      :class="{ 'is-dragging': isDragging }"
      :style="dragStyle"
      :aria-label="`当前特色：${activeLabel}，点击或拖动切换`"
      @click="onClick"
    >
      <SwapText :swap-key="activeId" :resolve="resolveItem" toss class="ft-swap">
        <template #default="{ item }">
          <span class="ft-pill"><span class="ft-label">{{ item.label }}</span></span>
        </template>
      </SwapText>
    </button>
  </span>
</template>

<style scoped>
/* ---- 容器：内联在文字流中，尺寸全部走 em（随身份行字号缩放） ---- */
.ft {
  position: relative;
  display: inline-block;
  line-height: 1;
  user-select: none;
  -webkit-user-select: none;
}

/* ---- 景深壳层（kexie dept-deck 暗语：后卡下沉/偏移/更糊/更暗） ---- */
.ft-shell {
  position: absolute;
  inset: 0;
  border-radius: var(--radius-full);
  background: var(--accent-2);
  pointer-events: none;
}

.ft-shell--a {
  transform: translate(0.28em, 0.16em) rotate(-3.5deg) scale(0.985);
  filter: blur(1px) brightness(0.72);
  opacity: 0.9;
}

.ft-shell--b {
  transform: translate(-0.22em, 0.28em) rotate(4deg) scale(0.965);
  filter: blur(1.8px) brightness(0.5);
  opacity: 0.75;
}

/* ---- 胶囊按钮：交互主体（点击/拖拽/键盘 Enter） ----
   font-size/font-family 显式 inherit：button 的 UA 默认（13.333px 系统字体）
   会打断 .ft 的 em 字号链，胶囊会缩成 13px 系（实测 78×28px）。 */
.ft-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  padding: 0;
  border: none;
  background: transparent;
  font-size: inherit;
  font-family: inherit;
  cursor: grab;
  will-change: transform;
}

.ft-btn.is-dragging {
  cursor: grabbing;
}

/* ---- 胶囊本体：点题橙实底 + 深色文字（--on-accent-2） ----
   每个换场层各自渲染完整胶囊（壳+字一起渐出/甩回，不会字走壳留）。 */
.ft-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 2.1em;
  padding: 0 0.9em;
  border-radius: var(--radius-full);
  background: var(--accent-2);
  color: var(--on-accent-2);
  box-shadow: var(--shadow-1);
  /* 顶对齐：压掉 inline-flex 基线对齐在行盒下方的 descender 空隙，
     保证 sizer/层高度 = 胶囊高度（按钮与壳层不错位） */
  vertical-align: top;
}

.ft-label {
  font-family: var(--font-display);
  font-size: 1em;
  font-weight: 700;
  letter-spacing: 0.01em;
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  /* 弹簧/换场由 useSpring 与 SwapText 的 reduce 分支退化；
     这里只去掉无意义的抓取光标态 */
  .ft-btn {
    cursor: pointer;
  }
}
</style>
