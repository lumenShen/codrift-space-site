<script setup lang="ts" generic="T">
/**
 * SwapText —— 文字换场管线（站长逐条规格，时间轴全部写死在此）：
 *   - old 内容：0s 起 0.3s 渐出（opacity 1→0）+ 模糊增大（blur 0→--swap-blur），
 *     动画结束（300ms）即卸载（setTimeout 同步移除 DOM）；
 *   - new 内容：0.2s 起 0.3s 渐入（opacity 0→1）+ 模糊减小；新旧切换全程 0.5s 内完成；
 *   - 容器宽度用 spring（微超伸预设）按「新内容」量测顺滑过渡：新旧内容同格
 *     绝对定位（.swap-layer 全部 absolute inset:0），隐藏 sizer 以新内容撑起容器
 *     高度并量宽（量宽瞬间转 absolute/max-content、读完立刻还原，同帧无闪烁），
 *     避免换行抖动；
 *   - toss 模式（FeatureTag 用，默认关）：旧层渐出的同时被「甩回」——spring
 *     微超伸（SPRING_SNAPPY，kexie 调研校准的更弹一档）驱动：轻微向上 5px +
 *     随机水平偏移 ±8px（随机偏移为站长管线规格，不取拖拽方向），scale 注入
 *     -2.8/s 初速走出 1→≈0.94→1（k=480/c=27 下 -2.8/s 仿真谷值 0.9434@50ms），
 *     90ms 后转入「甩回」相位（弹簧带劲把旧层拉向基线下方身后）；位移只写
 *     transform，不碰渐出/渐入的 opacity/filter 时间轴；
 *   - prefers-reduced-motion：两层动画退化为瞬时切换（CSS 关动画 + 旧层 0ms 卸载），
 *     宽度 spring 与 toss 弹簧由 SpringValue 自动退化为跳变/忽略 kick。
 *
 * 用法（旧层要在父组件重渲染后仍显示旧文案，故按键解析数据而非快照 vnode）：
 *   <SwapText :swap-key="activeId" :resolve="(k) => itemOf(k)" v-slot="{ item }">…</SwapText>
 * 根元素与层用 span（display:block）而非 div：组件要能合法地放进 <button>/
 * <p> 等只收 phrasing content 的容器里（FeatureTag 内联胶囊场景）。
 */
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, watch } from 'vue';
import { reducedMotion, SPRING_MICRO_OVERSHOOT, SPRING_SNAPPY, SpringValue } from '@/effects/useSpring';

const props = defineProps<{
  /** 换场键：变化即触发一次换场 */
  swapKey: string | number;
  /** 键 → 内容数据 */
  resolve: (key: string | number) => T;
  /** 换场模糊幅度（px），默认 6 */
  blur?: number;
  /** 量宽上限（px），超出则容器收窄由文本换行，默认 640 */
  maxWidth?: number;
  /** 旧层甩回模式（FeatureTag 换场用），默认关 */
  toss?: boolean;
}>();

interface Layer {
  key: string;
  item: T;
  phase: 'hold' | 'in' | 'out';
}

/* shallowRef：整组替换、不做深层变更，也避免 ref 把泛型 T 深解包成 UnwrapRef<T> */
const layers = shallowRef<Layer[]>([]);
const sizerItem = shallowRef<T | null>(null);
const sizerRef = ref<HTMLElement | null>(null);
const widthPx = ref(0);

const blurCss = computed(() => `${props.blur ?? 6}px`);
const capCss = computed(() => `${props.maxWidth ?? 640}px`);

/* 容器宽度弹簧：与卡片换位同一微超伸预设；精度 0.25px（整定速度阈值 8px/s） */
const widthSpring = new SpringValue(0, SPRING_MICRO_OVERSHOOT, 0.25);
widthSpring.onUpdate = () => {
  widthPx.value = widthSpring.value;
};

/* 规格时间轴（ms）：old 0→300 渐出；new 200→500 渐入；全程 500 内完成 */
const OUT_MS = 300;

/* ---- toss 甩回运行时（toss 模式；几何常量为 tag 尺寸的校准值） ----
   幅度参照上一代 FeatureStack 大卡甩起（-14px / ±22px / ≈380px 舞台宽）按
   tag 尺寸（≈110px 胶囊）缩放并略放大感知：-5px / ±8px；scale 谷值规格
   1→≈0.94→1，在 SPRING_SNAPPY 下 -2.8/s 初速仿真谷值 0.9434（k=320 时 -2.4/s
   即可达 0.9426，弹簧更弹后按同谷值重新标定）。 */
const TOSS_UP_PX = -5; // 轻微向上甩起
const TOSS_RAND_PX = 8; // 随机水平偏移幅度（±）
const TOSS_SETTLE_PX = 3; // 甩回相位：落到基线下方（身后）
const TOSS_SETTLE_MS = 90; // 甩起 → 甩回 的相位切换点
const TOSS_SCALE_DIP_VELOCITY = -2.8; // scale 初速（单位/s）：1 → ≈0.94 → 1

interface TossRuntime {
  x: SpringValue;
  y: SpringValue;
  scale: SpringValue;
  settleTimer: ReturnType<typeof setTimeout> | undefined;
}

const tossers = new Map<string, TossRuntime>();
const layerEls = new Map<string, HTMLElement>();

function writeToss(key: string): void {
  const rt = tossers.get(key);
  const el = layerEls.get(key);
  if (!rt || !el) return;
  el.style.transform = `translate3d(${rt.x.value.toFixed(2)}px, ${rt.y.value.toFixed(2)}px, 0) scale(${rt.scale.value.toFixed(4)})`;
}

/** 为一个即将渐出的旧层启动甩回弹簧（reduced-motion 时跳过，层 0ms 卸载） */
function spawnToss(key: string): void {
  if (!props.toss || reducedMotion.value) return;
  const rand = Math.random() * 2 - 1; // -1..1
  const x = new SpringValue(0, SPRING_SNAPPY, 0.05);
  const y = new SpringValue(0, SPRING_SNAPPY, 0.05);
  const scale = new SpringValue(1, SPRING_SNAPPY, 0.0005);
  const rt: TossRuntime = { x, y, scale, settleTimer: undefined };
  const onUpdate = (): void => writeToss(key);
  x.onUpdate = onUpdate;
  y.onUpdate = onUpdate;
  scale.onUpdate = onUpdate;
  x.setTarget(rand * TOSS_RAND_PX);
  y.setTarget(TOSS_UP_PX);
  scale.kick(TOSS_SCALE_DIP_VELOCITY);
  rt.settleTimer = setTimeout(() => {
    // 相位二（甩回）：弹簧带着甩出动量把旧层拉向基线下方的「身后」
    x.setTarget(rand * TOSS_RAND_PX * 1.6);
    y.setTarget(TOSS_SETTLE_PX);
  }, TOSS_SETTLE_MS);
  tossers.set(key, rt);
  writeToss(key);
}

function disposeToss(key: string): void {
  const rt = tossers.get(key);
  if (!rt) return;
  clearTimeout(rt.settleTimer);
  tossers.delete(key);
  layerEls.delete(key);
}

function disposeAllTosses(): void {
  for (const key of [...tossers.keys()]) disposeToss(key);
}

function setLayerEl(key: string, el: unknown): void {
  if (el) layerEls.set(key, el as HTMLElement);
  else layerEls.delete(key);
}

let measured = false;
let epoch = 0;
let outTimer: ReturnType<typeof setTimeout> | undefined;

const nextKey = (tag: string): string => `${tag}#${epoch++}`;

function measure(): void {
  const el = sizerRef.value;
  if (!el) return;
  el.classList.add('swap-sizer--measuring');
  const natural = Math.ceil(el.getBoundingClientRect().width);
  el.classList.remove('swap-sizer--measuring');
  const target = Math.max(0, Math.min(natural, props.maxWidth ?? 640));
  if (!target) return;
  if (measured) widthSpring.setTarget(target);
  else {
    widthSpring.set(target); // 首次量宽直接落位（首帧绘制前完成，无动画无闪烁）
    measured = true;
  }
}

watch(
  () => props.swapKey,
  (key) => {
    const item = props.resolve(key);
    if (item == null) return;
    if (!measured && layers.value.length === 0) {
      // 首帧：内容直接显形（hold 层无动画），宽度按新内容量测落位
      layers.value = [{ key: nextKey('hold'), item, phase: 'hold' }];
      sizerItem.value = item;
      void nextTick(measure);
      return;
    }
    clearTimeout(outTimer);
    disposeAllTosses(); // 上一轮 toss 运行时随层重建一并释放（旧 out 层被替换/重键）
    // 上一任现役层转入渐出（未完成的让位，保证同屏最多一组新旧）
    layers.value = [
      ...layers.value
        .filter((l) => l.phase !== 'out')
        .map((l) => ({ ...l, phase: 'out' as const, key: nextKey('out') })),
      { key: nextKey('in'), item, phase: 'in' as const },
    ];
    // toss 模式：渐出的旧层同时被甩回（随机偏移为站长管线规格）
    for (const l of layers.value) {
      if (l.phase === 'out') spawnToss(l.key);
    }
    sizerItem.value = item; // 宽度/高度按「新内容」量测
    void nextTick(measure);
    outTimer = setTimeout(
      () => {
        layers.value = layers.value.filter((l) => l.phase !== 'out');
      },
      reducedMotion.value ? 0 : OUT_MS,
    );
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  clearTimeout(outTimer);
  disposeAllTosses();
});
</script>

<template>
  <span
    class="swap"
    :style="{ width: widthPx > 0 ? `${widthPx}px` : undefined, '--swap-blur': blurCss }"
  >
    <span
      v-for="layer in layers"
      :key="layer.key"
      :ref="(el) => setLayerEl(layer.key, el)"
      class="swap-layer"
      :class="`swap-layer--${layer.phase}`"
      :aria-hidden="layer.phase === 'out' || undefined"
    >
      <slot :item="layer.item" />
    </span>
    <span ref="sizerRef" class="swap-sizer" aria-hidden="true">
      <slot v-if="sizerItem" :item="sizerItem" />
    </span>
  </span>
</template>

<style scoped>
.swap {
  position: relative;
  display: block;
  max-width: 100%;
}

/* 新旧内容同格绝对定位（规格原文：「新旧内容同格绝对定位、宽度按新内容量测过渡」） */
.swap-layer {
  position: absolute;
  inset: 0;
}

/* old：0s 起 0.3s 渐出 + 模糊增大 */
.swap-layer--out {
  animation: swap-out 0.3s var(--ease-out-quart) both;
}

/* new：0.2s 起 0.3s 渐入 + 模糊减小（delay 0.2s 写死，全程 0.5s 内完成） */
.swap-layer--in {
  animation: swap-in 0.3s var(--ease-out-quart) 0.2s both;
}

/* 首帧内容：直接显形，不播换场动画 */
.swap-layer--hold {
  opacity: 1;
  filter: none;
}

/* 隐藏 sizer：撑起容器高度 + 量宽基准（aria-hidden + visibility 双保险）。
   span 根需要显式块级化（组件根/层用 span 是为了合法进入 button/p 容器）。 */
.swap-sizer {
  display: block;
  visibility: hidden;
}

/* 量宽瞬间：转 absolute / max-content，读数后立刻还原（同一同步块，无中间绘制） */
.swap-sizer--measuring {
  position: absolute;
  width: max-content;
  max-width: v-bind(capCss);
}

@keyframes swap-out {
  from {
    opacity: 1;
    filter: blur(0);
  }

  to {
    opacity: 0;
    filter: blur(var(--swap-blur, 6px));
  }
}

@keyframes swap-in {
  from {
    opacity: 0;
    filter: blur(var(--swap-blur, 6px));
  }

  to {
    opacity: 1;
    filter: blur(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .swap-layer--in,
  .swap-layer--out {
    animation: none;
  }

  /* 旧层立即消失（JS 侧 0ms 卸载，双保险） */
  .swap-layer--out {
    display: none;
  }
}
</style>
