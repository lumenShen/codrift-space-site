<script setup lang="ts">
/**
 * FeatureStack —— 首页特色轮播（改造自 vue-bits Stack，上游源码存档于
 * research/vue-bits/Stack.vue）。与上游的差异（改造，不是照搬）：
 *
 *   - 去掉 motion-v 依赖与拖拽：全部运动由自实现 rAF spring 驱动
 *     （@/effects/useSpring 微超伸预设 k=320/c=24/m=1，ζ≈0.671、过冲≈5.8%，
 *     ≈0.24s 到峰、≈0.33s 回 2% 带内），只动 transform/opacity/filter；
 *   - 层叠几何重做：上游按深度缩放 + 扇形旋转（rotateZ=(L-i-1)·4°、
 *     scale=1-(L-i)·0.06、transformOrigin 90% 90%，Stack.vue:29-31）；
 *     本组件各深度同尺寸（scale 恒 1），深度用「下沉 14px/层 + 渐深模糊
 *     1.4px/层 + 减淡 0.12/层 + 个体微倾」表达；
 *   - 顶层卡离场（站长逐条规格）：spring 微超伸移入底层并加深模糊；离开瞬间
 *     先甩向「随机水平偏移 ±22px + 轻微向上 14px」的相位目标（90ms，期间保持
 *     最高 z、在全体之上），随后弹簧带着甩出动量把它拉回底层位（z 同步沉底），
 *     底层位过冲 ≈3.3px（≈5.1% 行程，±0.5px 整定 ≈0.50s）；scale 以 -2.4/s 初速注入，走出
 *     1 → ≈0.94 → 1 的既视感（数值仿真谷值 0.9426@≈0.05s）；
 *   - 自动轮播 5s（hover/聚焦暂停、页面隐藏暂停、按钮可手动暂停）+
 *     prev/next + 指示点（24px 命中区）；手动切换重置计时；
 *   - 文字分两层、不重复：卡面承载 图标+编号+大标题（深度模糊直接作用在标题上，
 *     「越深越糊」一眼可见）；说明文字不上面板，在舞台下方经 SwapText 0.5s 换场
 *     管线过渡（容器宽度 spring 量测顺滑变化，防换行抖动）；标题以视觉隐藏文本
 *     随读屏 aria-live 一并播报；
 *   - 紧凑尺寸（hero 右栏规格：约 380~440 宽 × 420~480 高）：舞台满栏宽、4/3，
 *     380~424px 栏宽下整组件总高 ≈441~474px（舞台 285~318 + 读出区 72 +
 *     控制行 36 + 间距 48）；
 *   - prefers-reduced-motion：自动轮播不启动；手动切换由弹簧退化为瞬时换位。
 */
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch, type CSSProperties } from 'vue';
import { reducedMotion, SPRING_MICRO_OVERSHOOT, SpringValue } from '@/effects/useSpring';
import SwapText from './SwapText.vue';

interface FeatureCard {
  id: string;
  title: string;
  desc: string;
  icon: 'palette' | 'bolt' | 'box' | 'pulse' | 'music';
}

const props = withDefaults(
  defineProps<{
    cards?: FeatureCard[];
    /** 自动轮播间隔（约 5s 规格值） */
    intervalMs?: number;
  }>(),
  { intervalMs: 5000 },
);

/** 五张特色卡（站长定稿话题；说明只做中性转述，不编造个人经历） */
const DEFAULT_CARDS: FeatureCard[] = [
  {
    id: 'aesthetic',
    title: '前端审美',
    desc: '研究好看的前端效果和经验，把值得拆解的实现思路收进站点。',
    icon: 'palette',
  },
  {
    id: 'efficiency',
    title: '效率至上',
    desc: 'vibe Coding 的使用经验和分享交流，把想法更快变成能跑的东西。',
    icon: 'bolt',
  },
  {
    id: 'output',
    title: '产品产出',
    desc: '从想法到成品：Rein、EffiBuddy、开源笔记库等作品的沉淀与展示。',
    icon: 'box',
  },
  {
    id: 'sport',
    title: '运动交流',
    desc: '关于运动的记录与交流，给久坐的代码节奏留一段身体的运转。',
    icon: 'pulse',
  },
  {
    id: 'music',
    title: '音乐爱好',
    desc: '听歌口味与音乐相关的分享，给代码之外留一点旋律。',
    icon: 'music',
  },
];

/* 卡组：未传 prop 时用内置默认（defineProps 默认值不能引用 setup 局部变量，
   兜底放这里）；cards 视为静态，运行期不变。 */
const cards = computed<FeatureCard[]>(() => props.cards ?? DEFAULT_CARDS);

/* ---- 层叠几何常量（深度 d：0=顶层，越大越深） ---- */
const DEPTH_STEP = 14; // px/层：每深一层下沉 14px
const BLUR_STEP = 1.4; // px/层：越深越糊（顶层 0 → 最深 5.6px）
const FADE_STEP = 0.12; // 每层减淡（最深 0.52）
const Z_TOP = 50;
const Z_STEP = 10;
const FLICK_APEX_PX = -14; // 甩起相位的目标 y（轻微向上）
const FLICK_RAND_PX = 22; // 甩起相位的随机水平偏移幅度
const FLICK_MS = 90; // 甩起相位时长：之后弹簧带动量把它拉回底层位（z 同步沉底）
const SCALE_DIP_VELOCITY = -2.4; // scale 初速（单位/s）：1 → ≈0.94 → 1（仿真谷值 0.9426）

interface CardRuntime {
  id: string;
  tilt: number; // 个体微倾角（±1.6°，按 id 确定性生成）
  sway: number; // 个体水平漂移幅度（±9px）
  x: SpringValue;
  y: SpringValue;
  rot: SpringValue;
  scale: SpringValue;
  blur: SpringValue;
  fade: SpringValue;
  z: number;
  zTimer?: ReturnType<typeof setTimeout>;
}

interface CardStyle extends CSSProperties {
  transform: string;
  filter: string;
  opacity: number;
  zIndex: number;
}

const order = ref<string[]>(cards.value.map((c) => c.id));
const runtimes = new Map<string, CardRuntime>();
const styles = reactive<Record<string, CardStyle>>({});

/** 字符串种子 → [0,1)：同一张卡在每次轮换里保持同一「手感」 */
function seeded(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

/** 深度 d 的静止姿态（scale 恒 1，深度只由下沉/模糊/减淡/微倾表达） */
function poseAt(depth: number, rt: CardRuntime) {
  const f = depth === 0 ? 0 : 0.5 + 0.18 * depth;
  return {
    x: rt.sway * f,
    y: depth * DEPTH_STEP,
    rot: rt.tilt * f,
    scale: 1,
    blur: depth * BLUR_STEP,
    fade: 1 - depth * FADE_STEP,
  };
}

/** 把一张卡的六个弹簧当前值合成进 styles（每帧最多 6 次调用/卡） */
function flush(id: string): void {
  const rt = runtimes.get(id);
  if (!rt) return;
  const s = (styles[id] ??= { transform: '', filter: '', opacity: 1, zIndex: 0 });
  s.transform = `translate3d(${rt.x.value.toFixed(2)}px, ${rt.y.value.toFixed(2)}px, 0) rotate(${rt.rot.value.toFixed(3)}deg) scale(${rt.scale.value.toFixed(4)})`;
  s.filter = rt.blur.value >= 0.05 ? `blur(${rt.blur.value.toFixed(2)}px)` : 'none';
  s.opacity = Number(rt.fade.value.toFixed(3));
  s.zIndex = rt.z;
}

for (const card of cards.value) {
  const depth = order.value.indexOf(card.id);
  const rt: CardRuntime = {
    id: card.id,
    tilt: (seeded(card.id) * 2 - 1) * 1.6,
    sway: (seeded(`${card.id}:x`) * 2 - 1) * 9,
    x: new SpringValue(0, SPRING_MICRO_OVERSHOOT, 0.05),
    y: new SpringValue(0, SPRING_MICRO_OVERSHOOT, 0.05),
    rot: new SpringValue(0, SPRING_MICRO_OVERSHOOT, 0.01),
    scale: new SpringValue(1, SPRING_MICRO_OVERSHOOT, 0.0005),
    blur: new SpringValue(0, SPRING_MICRO_OVERSHOOT, 0.02),
    fade: new SpringValue(1, SPRING_MICRO_OVERSHOOT, 0.002),
    z: Z_TOP - depth * Z_STEP,
  };
  for (const s of [rt.x, rt.y, rt.rot, rt.scale, rt.blur, rt.fade]) {
    s.onUpdate = () => flush(card.id);
  }
  const pose = poseAt(depth, rt);
  rt.x.set(pose.x);
  rt.y.set(pose.y);
  rt.rot.set(pose.rot);
  rt.blur.set(pose.blur);
  rt.fade.set(pose.fade);
  runtimes.set(card.id, rt);
  flush(card.id);
}

/** 舞台底部的「卡尾」：最底层卡下沉 (n-1)·14px 后正好贴住舞台底 */
const tailPx = (cards.value.length - 1) * DEPTH_STEP;

/** 重排深度：所有卡向新深度的静止姿态滑去（弹簧保留既有速度，可打断） */
function applyOrder(next: string[], travel?: { id: string; mode: 'to-back' | 'to-front' }): void {
  order.value = next;
  next.forEach((id, depth) => {
    const rt = runtimes.get(id);
    if (!rt) return;
    const pose = poseAt(depth, rt);
    const leaving = travel?.mode === 'to-back' && id === travel.id;

    if (leaving) {
      // 相位一（离开瞬间）：轻微向上甩起、甩向一个随机水平偏移的位置；
      // scale 立即注入负初速走出 1 → ≈0.94 → 1（目标保持 1，无需二次拨动）。
      // 90ms 后由 zTimer 进入相位二：弹簧带着甩出动量拉回底层位并沉底。
      const rand = Math.random() * 2 - 1; // -1..1
      rt.scale.set(1);
      rt.scale.kick(SCALE_DIP_VELOCITY);
      rt.y.setTarget(FLICK_APEX_PX);
      rt.x.setTarget(rand * FLICK_RAND_PX);
      rt.rot.setTarget(rt.tilt * 0.5);
      rt.blur.setTarget(BLUR_STEP); // 甩起时先起一点模糊
      rt.fade.setTarget(0.9);
      flush(id);
    } else {
      rt.x.setTarget(pose.x);
      rt.y.setTarget(pose.y);
      rt.rot.setTarget(pose.rot);
      rt.scale.setTarget(pose.scale);
      rt.blur.setTarget(pose.blur);
      rt.fade.setTarget(pose.fade);
    }

    clearTimeout(rt.zTimer);
    if (leaving) {
      rt.z = Z_TOP; // 甩起期间保持在全体之上
      flush(id);
      rt.zTimer = setTimeout(
        () => {
          // 相位二：弹簧带着甩出动量拉回底层位（移入底部并增加模糊），z 同步沉底
          rt.y.setTarget(pose.y);
          rt.x.setTarget(pose.x);
          rt.rot.setTarget(pose.rot);
          rt.blur.setTarget(pose.blur);
          rt.fade.setTarget(pose.fade);
          rt.z = Z_TOP - depth * Z_STEP;
          flush(id);
        },
        reducedMotion.value ? 0 : FLICK_MS,
      );
    } else {
      rt.z = Z_TOP - depth * Z_STEP;
      flush(id);
    }
  });
}

/* ---- 轮播驱动 ---- */

function advance(dir: 1 | -1): void {
  const cur = order.value;
  if (cur.length < 2) return;
  if (dir === 1) {
    const topId = cur[0];
    applyOrder([...cur.slice(1), topId], { id: topId, mode: 'to-back' });
  } else {
    const backId = cur[cur.length - 1];
    applyOrder([backId, ...cur.slice(0, -1)], { id: backId, mode: 'to-front' });
  }
  restartAutoplay(); // 手动切换重置 5s 计时
}

function jumpTo(id: string): void {
  if (order.value[0] === id) return;
  applyOrder([id, ...order.value.filter((x) => x !== id)], { id, mode: 'to-front' });
  restartAutoplay();
}

const playing = ref(true); // 播放/暂停按钮
const hovered = ref(false); // hover / 控件聚焦时暂停
const canRun = computed(() => playing.value && !hovered.value && !reducedMotion.value);

let timer: ReturnType<typeof setInterval> | undefined;

function stopAutoplay(): void {
  if (timer) {
    clearInterval(timer);
    timer = undefined;
  }
}

function restartAutoplay(): void {
  stopAutoplay();
  if (!canRun.value || order.value.length < 2) return;
  timer = setInterval(() => advance(1), props.intervalMs);
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
  for (const rt of runtimes.values()) clearTimeout(rt.zTimer);
});

/* ---- 派生量与 SwapText 桥接 ---- */

const orderCards = computed<FeatureCard[]>(() =>
  order.value.map((id) => cards.value.find((c) => c.id === id) ?? cards.value[0]),
);
const activeId = computed(() => order.value[0]);

/** 卡片的固定序号（卡面编号不随轮换漂移） */
function cardNo(id: string): number {
  return cards.value.findIndex((c) => c.id === id) + 1;
}

function resolveCard(key: string | number): FeatureCard {
  return cards.value.find((c) => c.id === key) ?? cards.value[0];
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
</script>

<template>
  <div
    class="fs"
    role="group"
    aria-roledescription="轮播"
    aria-label="站点特色"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
    @focusin="hovered = true"
    @focusout="hovered = false"
  >
    <div class="fs-stage" :style="{ '--fs-tail': `${tailPx}px` }">
      <article
        v-for="(card, depth) in orderCards"
        :key="card.id"
        class="fs-card"
        :style="styles[card.id]"
        :aria-hidden="depth !== 0 || undefined"
      >
        <div class="fs-card-top">
          <span class="fs-card-icon" aria-hidden="true">
            <svg
              v-if="card.icon === 'palette'"
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" />
              <circle cx="12" cy="12" r="2.6" />
            </svg>
            <svg
              v-else-if="card.icon === 'bolt'"
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M13 2 4.5 13.5h6L11 22l8.5-11.5h-6L13 2Z" />
            </svg>
            <svg
              v-else-if="card.icon === 'box'"
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M12 2.8 20.5 7v10L12 21.2 3.5 17V7L12 2.8Z" />
              <path d="M3.5 7 12 11.4 20.5 7" />
              <path d="M12 11.4v9.8" />
            </svg>
            <svg
              v-else-if="card.icon === 'pulse'"
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M2.5 12.5h4.2l2.2-6 4.4 12 2.2-6h6" />
            </svg>
            <svg
              v-else
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M9 18.5V5.5l10-2v12.5" />
              <circle cx="6.8" cy="18.5" r="2.2" />
              <circle cx="16.8" cy="16" r="2.2" />
            </svg>
          </span>
          <span class="fs-card-no" aria-hidden="true">{{ pad(cardNo(card.id)) }}</span>
        </div>
        <p class="fs-card-title">{{ card.title }}</p>
      </article>
    </div>

    <div class="fs-readout" aria-live="polite">
      <SwapText :swap-key="activeId" :resolve="resolveCard">
        <template #default="{ item }">
          <span class="fs-sr">{{ item.title }}——</span>
          <p class="fs-readout-desc">{{ item.desc }}</p>
        </template>
      </SwapText>
    </div>

    <div class="fs-controls">
      <button type="button" class="fs-ctl" aria-label="上一张" @click="advance(-1)">
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path
            d="M14.5 5.5 8 12l6.5 6.5"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>

      <div class="fs-dots">
        <button
          v-for="(c, i) in cards"
          :key="c.id"
          type="button"
          class="fs-dot"
          :class="{ 'is-active': c.id === activeId }"
          :aria-label="`第 ${i + 1} 项：${c.title}`"
          :aria-current="c.id === activeId || undefined"
          @click="jumpTo(c.id)"
        ></button>
      </div>

      <button type="button" class="fs-ctl" aria-label="下一张" @click="advance(1)">
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path
            d="m9.5 5.5 6.5 6.5-6.5 6.5"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>

      <button
        type="button"
        class="fs-ctl"
        :aria-label="playing ? '暂停轮播' : '继续轮播'"
        @click="playing = !playing"
      >
        <svg v-if="playing" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
          <path
            d="M9.2 6.5v11M14.8 6.5v11"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
        <svg v-else viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
          <path
            d="M9 6.2v11.6L18.2 12 9 6.2Z"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.fs {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-5);
  width: 100%;
}

/* ---- 舞台：满栏宽 4/3（hero 右栏 380~424px 栏宽 → 285~318px 高），
   含 (n-1)×14px「卡尾」（--fs-tail 由组件注入） ---- */
.fs-stage {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
}

/* ---- 卡片：轻玻璃（--glass-bg + 光学内层），非 GlassSurface 重材质 ----
   顶行（图标+编号）在流内，标题 margin:auto 在剩余空间垂直居中。 */
.fs-card {
  position: absolute;
  inset: 0 0 var(--fs-tail, 56px) 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-5) var(--space-6);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--glass-bg);
  box-shadow: var(--shadow-1), var(--glass-insets);
  /* 轮播动画只动 transform/opacity/filter（规格）；will-change 限定这三类 */
  will-change: transform, filter, opacity;
  backface-visibility: hidden;
}

.fs-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.fs-card-icon {
  display: inline-flex;
  color: var(--accent);
}

.fs-card-no {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--fg-2);
  font-variant-numeric: tabular-nums;
}

.fs-card-title {
  margin: auto 0;
  font-family: var(--font-display);
  font-size: 1.55rem;
  font-weight: 750;
  letter-spacing: -0.02em;
  text-align: center;
  color: var(--fg-0);
}

/* ---- 说明读出区：当前卡的说明文字（SwapText 0.5s 换场） ----
   min-height 吸收一行/两行说明的高度差，避免控制行跳动 */
.fs-readout {
  display: flex;
  justify-content: center;
  text-align: center;
  max-width: 100%;
  min-height: 4.5rem;
}

/* 视觉隐藏（读屏播报当前卡标题；绝对定位不占版面、不影响 sizer 量宽） */
.fs-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

.fs-readout-desc {
  margin: 0;
  color: var(--fg-1);
  font-size: 0.92rem;
  line-height: 1.7;
}

/* ---- 控制行：prev / 指示点 / next / 播放暂停 ---- */
.fs-controls {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.fs-ctl {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--fg-1);
  cursor: pointer;
  transition:
    background-color var(--dur-fast) ease-out,
    color var(--dur-fast) ease-out,
    border-color var(--dur-fast) ease-out;
}

.fs-ctl:hover {
  background: var(--tab-hover);
  border-color: var(--line-strong);
  color: var(--fg-0);
}

.fs-ctl:active {
  transform: scale(0.96);
}

.fs-ctl svg {
  display: block;
}

.fs-dots {
  display: flex;
  align-items: center;
}

/* 指示点：24px 命中区，视觉点 8px；当前项拉长并点亮主色 */
.fs-dot {
  position: relative;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.fs-dot::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: 8px;
  height: 8px;
  transform: translate(-50%, -50%);
  border-radius: var(--radius-full);
  background: var(--line-strong);
  transition:
    background-color var(--dur-fast) ease-out,
    width var(--dur-fast) ease-out;
}

.fs-dot:hover::before {
  background: var(--fg-2);
}

.fs-dot.is-active::before {
  width: 20px;
  background: var(--accent);
}

@media (max-width: 640px) {
  .fs-card {
    padding: var(--space-4) var(--space-5);
  }

  .fs-card-title {
    font-size: 1.3rem;
  }

  .fs-readout {
    min-height: 6rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .fs-ctl,
  .fs-dot::before {
    transition: none;
  }

  .fs-ctl:active {
    transform: none;
  }
}
</style>
