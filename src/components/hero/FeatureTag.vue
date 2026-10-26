<script setup lang="ts">
/**
 * FeatureTag —— 身份行内联特色「卡片堆」（改造自 vue-bits Stack，上游源码存档
 * research/vue-bits/Stack.vue）。视觉仍是 kexie 式点题胶囊，但交互从单胶囊
 * 升级为一副真正可拖拽的牌堆：
 *
 * 结构
 *  - 五张特色卡同格叠放（CSS grid 同一格），按 depth 计算扇形姿态：
 *    后方卡片逐层缩小 / 下沉 / 交替微旋 / 变淡，最上面的卡才是交互主体；
 *  - 每张卡带自己的主题色（页面经 `tone` 传入令牌表达式）。轮播走完一轮
 *    正好经过五种主题色；当前卡颜色同时由页面消费到 hero 光斑与 Describe
 *    行的关键词上（页面用 activeId 算 tone，组件只管发 update:activeId）。
 *
 * 拖拽与换牌（对照上游 Stack 的 sendToBack 语义）
 *  - 按下 1:1 跟手：直接写 SpringValue 的当前值，不加弹性延迟，手指在哪卡在哪；
 *    水平位移同时驱动倾角（±10°）与轻微抬升（最多 +5%），形成「捏起一张牌」。
 *  - 松手后交给弹簧：x / y / rotate / scale 全部是 SpringValue，共享
 *    useSpring 的单根 rAF 管线，不新建计时器。
 *  - 换牌信号有两个，满足任一即触发（上游只有 offset 一个）：
 *      1) 位移阈值 = 0.32 × 卡宽（夹 24–64px）；
 *      2) 甩出速度 = 4.2 × 卡宽 px/s（夹 320–900px/s）——快速轻甩也能换牌。
 *  - 初速匹配：松手瞬间把 PointerVelocity 采到的 vx/vy 注入 x/y 弹簧（rotate /
 *    scale 也按 vx / 合速度注入），所以卡不是「回到起点再重排」，而是顺着手指
 *    的动量继续飞、再被弹簧收回牌堆后方；未过阈值时同样注入半速，回弹有惯性。
 *  - 换牌后 activeId 变化 → 整副牌重新计算 depth → 每张卡用弹簧滑到新位，
 *    被甩出的卡目标变成最后一层，于是「飞出 → 缩小 → 落入牌堆底部」一气呵成。
 *  - 换牌分两拍：旧顶卡先以顶层姿态向下沉 2em；沉到最外端的那一刻才真正
 *    换牌（z-index 降为底层、开始虚化、整副牌重排），随后它在底层回弹归位。
 *    press 是独立弹簧，初速按当前 em 与弹簧参数换算成精确首峰，首峰时刻也由
 *    同一套积分器算出；与 x/y 共用一根 rAF 管线，不额外开动画计时器。
 *
 * 随机姿态与景深（本站新增，上游 Stack 只有 ±5° 的 randomRotation）
 *  - 每张后方卡首次出现时抽一份固定的随机量：±randomRotationAmount 的倾角，以及
 *    transform-origin 在 50% 85% 基础上横纵各 ±randomRotationOriginOffsetAmount
 *    的偏移。随机量按卡 id 保存，换牌重排只改 depth、不改「性格」——牌堆像
 *    随手摊开又收回的一叠实体卡，而不是每次换牌重新抖一遍。
 *  - 顶卡（depth 0）始终水平：它和身份行文字同排，随机倾斜会让整行显得歪；
 *    水平位移驱动的临时倾角只在拖拽期间存在，松手即回 0°。
 *  - 非顶卡按 depth 逐层虚化，每深一层 +0.03em；blur 直接吃 em，随身份行
 *    字号整体缩放，小屏大屏的景深比例一致。
 *
 * 轮播与可达性
 *  - 约 5s 自动换牌；悬停、拖拽、聚焦、页面隐藏都暂停，手动换牌重置计时；
 *    prefers-reduced-motion 停用自动轮播（弹簧由 useSpring 退化为瞬时跳变）。
 *  - 只有最上面的卡可聚焦（后方卡 disabled + aria-hidden），Enter/Space 触发
 *    click 换牌；←/↑ 上一张、→/↓ 下一张；aria-live 只在手动换牌时播报。
 *  - 触屏允许真实拖拽（touch-action: none 只作用于最上面的卡），
 *    不再沿用上游 mobileClickOnly 的「触屏只点击」降级。
 */
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type CSSProperties,
} from 'vue';
import { reducedMotion, SpringValue } from '@/effects/useSpring';
import {
  clamp,
  impulseResponse,
  PointerVelocity,
  SPRING_STACK,
  stackPose,
} from './stackMotion';

export interface FeatureTagItem {
  id: string;
  label: string;
  /** 该卡的主题色（CSS 颜色表达式；页面传令牌引用，如 var(--aurora-violet)） */
  tone?: string;
}

const props = withDefaults(
  defineProps<{
    /** 特色条目（标签定稿：前端审美/效率至上/产品产出/运动交流/音乐爱好） */
    items: FeatureTagItem[];
    /** 当前特色 id（页面持有，与 Describe 行共用） */
    activeId: string;
    /** 自动轮播间隔（约 5s 规格值） */
    intervalMs?: number;
    /** 后方卡是否带固定随机倾角（顶卡始终水平，不参与随机） */
    randomRotation?: boolean;
    /** 随机倾角幅度：在后方卡上叠加 ±该角度（deg） */
    randomRotationAmount?: number;
    /** 是否随机偏移每张卡的 transform-origin（旋转支点） */
    randomRotationOriginOffset?: boolean;
    /** 原点随机幅度：以 50% 85% 为基准，横纵各 ±该百分点 */
    randomRotationOriginOffsetAmount?: number;
  }>(),
  {
    intervalMs: 5000,
    randomRotation: true,
    randomRotationAmount: 10,
    randomRotationOriginOffset: true,
    randomRotationOriginOffsetAmount: 12,
  },
);

const emit = defineEmits<{ 'update:activeId': [id: string] }>();

/* ---------------- 牌堆顺序 ----------------
   active 永远排第一（最上层），其余按 items 原序跟随；activeId 一变，
   整副牌的 depth 全部重排——这就是换牌动画的唯一数据源。 */
const ordered = computed<FeatureTagItem[]>(() => {
  const { items } = props;
  if (items.length === 0) return [];
  const found = items.findIndex((item) => item.id === props.activeId);
  const start = found < 0 ? 0 : found;
  return items.map((_, offset) => items[(start + offset) % items.length]);
});

/* 反序渲染：最上层的卡在 DOM 里最后出现，即使 JS 尚未写 z-index 也不会闪错层 */
const rendered = computed(() =>
  ordered.value.map((item, depth) => ({ item, depth })).reverse(),
);

const activeItem = computed<FeatureTagItem | null>(() => ordered.value[0] ?? null);
const activeLabel = computed(() => activeItem.value?.label ?? '');

/* ---------------- 每张卡的弹簧运行时 ----------------
   弹簧值只在 onUpdate 里标脏，同一帧内多根弹簧合并成一次 DOM 写入
   （queueMicrotask 在绘制前执行），5 张卡 = 每帧最多 5 次 transform 写入。 */
interface CardMotion {
  x: SpringValue;
  y: SpringValue;
  rotate: SpringValue;
  scale: SpringValue;
  opacity: SpringValue;
  /** 换牌下压：独立弹簧，绕 0 振动，叠加进 y（顶卡沉 2em 后自动回弹） */
  press: SpringValue;
}

const motions = new Map<string, CardMotion>();
const cardEls = new Map<string, HTMLElement>();
const dirty = new Set<string>();
let flushQueued = false;

function writeCard(id: string): void {
  const motion = motions.get(id);
  const el = cardEls.get(id);
  if (!motion || !el) return;
  el.style.transform =
    `translate3d(${motion.x.value.toFixed(2)}px, ${(motion.y.value + motion.press.value).toFixed(2)}px, 0) ` +
    `rotate(${motion.rotate.value.toFixed(2)}deg) scale(${motion.scale.value.toFixed(4)})`;
  el.style.opacity = motion.opacity.value.toFixed(3);
}

function markDirty(id: string): void {
  dirty.add(id);
  if (flushQueued) return;
  flushQueued = true;
  queueMicrotask(() => {
    flushQueued = false;
    for (const key of dirty) writeCard(key);
    dirty.clear();
  });
}

function createMotion(id: string): CardMotion {
  const onChange = (): void => markDirty(id);
  const motion: CardMotion = {
    x: new SpringValue(0, SPRING_STACK, 0.05),
    y: new SpringValue(0, SPRING_STACK, 0.05),
    rotate: new SpringValue(0, SPRING_STACK, 0.01),
    scale: new SpringValue(1, SPRING_STACK, 0.0005),
    opacity: new SpringValue(1, SPRING_STACK, 0.001),
    press: new SpringValue(0, SPRING_STACK, 0.01),
  };
  motion.x.onUpdate = onChange;
  motion.y.onUpdate = onChange;
  motion.rotate.onUpdate = onChange;
  motion.scale.onUpdate = onChange;
  motion.opacity.onUpdate = onChange;
  motion.press.onUpdate = onChange;
  motions.set(id, motion);
  return motion;
}

function motionOf(id: string): CardMotion {
  return motions.get(id) ?? createMotion(id);
}

function setCardEl(id: string, el: unknown): void {
  if (el) cardEls.set(id, el as HTMLElement);
  else cardEls.delete(id);
}

/* ---------------- 尺寸量测与目标姿态 ---------------- */
const deckRef = ref<HTMLElement | null>(null);
const size = { width: 0, height: 32 };
let measured = false;

function measure(): void {
  const deck = deckRef.value;
  if (!deck) return;
  const rect = deck.getBoundingClientRect();
  if (rect.width > 0) size.width = rect.width;
  if (rect.height > 0) size.height = rect.height;
}

/* ---------------- 每张卡的固定随机量 ----------------
   只抽一次、按卡 id 存起来：换牌导致 depth 变化时，倾角与支点保持原样。
   存的是 [-1, 1] 的随机系数而不是最终值，这样 randomRotationAmount 一类
   的 prop 改动能立即按新幅度重算，无需重新抽签。 */
interface CardRandomness {
  /** 倾角系数，最终角度 = 系数 × randomRotationAmount */
  rotation: number;
  /** 支点横向偏移系数 */
  originX: number;
  /** 支点纵向偏移系数 */
  originY: number;
}

const ORIGIN_BASE_X = 50;
const ORIGIN_BASE_Y = 85;

const randomness = new Map<string, CardRandomness>();

function randomUnit(): number {
  return Math.random() * 2 - 1;
}

function randomOf(id: string): CardRandomness {
  let random = randomness.get(id);
  if (!random) {
    random = { rotation: randomUnit(), originX: randomUnit(), originY: randomUnit() };
    randomness.set(id, random);
  }
  return random;
}

/** 后方卡的固定随机倾角（deg）；顶卡（depth 0）始终水平，不参与抽签 */
function cardTilt(id: string, depth = 0): number {
  if (depth === 0 || !props.randomRotation) return 0;
  return randomOf(id).rotation * props.randomRotationAmount;
}

/** 这张卡的 transform-origin；关掉 randomRotationOriginOffset 时回到 50% 85% */
function cardOrigin(id: string): string {
  if (!props.randomRotationOriginOffset) {
    return `${ORIGIN_BASE_X}% ${ORIGIN_BASE_Y}%`;
  }
  const random = randomOf(id);
  const x = ORIGIN_BASE_X + random.originX * props.randomRotationOriginOffsetAmount;
  const y = ORIGIN_BASE_Y + random.originY * props.randomRotationOriginOffsetAmount;
  return `${x.toFixed(2)}% ${y.toFixed(2)}%`;
}

/** 换牌下压深度（em）：2em ≈ 把整张胶囊往牌堆里按下去一截 */
const PRESS_DEPTH_EM = 2;

/** 换牌时把当前顶卡向下压 2em；返回下压到最外端（首峰）所需时间（ms） */
function pressCard(id: string): number {
  const el = cardEls.get(id);
  const fontSize = el ? parseFloat(getComputedStyle(el).fontSize) : NaN;
  const em = Number.isFinite(fontSize) && fontSize > 0 ? fontSize : size.height / 2.1;
  const impulse = impulseResponse(em * PRESS_DEPTH_EM, SPRING_STACK);
  motionOf(id).press.kick(impulse.velocity);
  return impulse.peakTime * 1000;
}

/** 换牌/重排时把每张卡的目标姿态同步到弹簧（instant 用于首帧与尺寸变化） */
function applyTargets(instant = false): void {
  const cards = rendered.value;
  for (const { item, depth } of cards) {
    const el = cardEls.get(item.id);
    if (el) {
      el.style.zIndex = String(cards.length - depth);
      // 支点跟着卡走而不是跟着 depth 走：同一张卡从顶到底，摆动支点不变
      el.style.transformOrigin = cardOrigin(item.id);
    }
    if (dragId === item.id && !instant) continue; // 拖拽中不夺走手指位置
    const motion = motionOf(item.id);
    const pose = stackPose(depth, size.height, cardTilt(item.id, depth));
    if (instant) {
      motion.x.set(pose.x);
      motion.y.set(pose.y);
      motion.rotate.set(pose.rotate);
      motion.scale.set(pose.scale);
      motion.opacity.set(pose.opacity);
      motion.press.set(0);
    } else {
      motion.x.setTarget(pose.x);
      motion.y.setTarget(pose.y);
      motion.rotate.setTarget(pose.rotate);
      motion.scale.setTarget(pose.scale);
      motion.opacity.setTarget(pose.opacity);
    }
  }
}

/* ---------------- 拖拽 ----------------
   阈值随卡宽缩放：卡越小越容易「甩」出去；速度阈值夹在 320–900px/s，
   对应桌面鼠标快速一拨与触屏轻扫都能命中的区间。 */
const DRAG_DEAD_ZONE = 4; // 超过此位移才算拖拽（抑制误触 click）
const OFFSET_RATIO = 0.32;
const FLING_RATIO = 4.2;

const isDragging = ref(false);
const velocity = new PointerVelocity();

let dragId: string | null = null;
let pointerId: number | null = null;
let startX = 0;
let startY = 0;
let lastX = 0;
let lastY = 0;
let moved = false;
let suppressClick = false;
let suppressTimer: ReturnType<typeof setTimeout> | undefined;

function offsetThreshold(): number {
  return clamp((size.width || 96) * OFFSET_RATIO, 24, 64);
}

function flingThreshold(): number {
  return clamp((size.width || 96) * FLING_RATIO, 320, 900);
}

function suppressNextClick(): void {
  suppressClick = true;
  clearTimeout(suppressTimer);
  suppressTimer = setTimeout(() => {
    suppressClick = false;
  }, 400);
}

function onPointerDown(event: PointerEvent, id: string, depth: number): void {
  if (depth !== 0 || id !== props.activeId) return;
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  const el = event.currentTarget as HTMLElement | null;
  if (!el) return;

  pointerId = event.pointerId;
  dragId = id;
  startX = lastX = event.clientX;
  startY = lastY = event.clientY;
  moved = false;
  suppressClick = false;
  isDragging.value = true;
  velocity.reset(event.clientX, event.clientY, event.timeStamp);
  el.setPointerCapture(event.pointerId);
  stopAutoplay();
}

function onPointerMove(event: PointerEvent): void {
  if (pointerId !== event.pointerId || !dragId) return;
  const dx = event.clientX - startX;
  const dy = event.clientY - startY;
  lastX = event.clientX;
  lastY = event.clientY;
  velocity.sample(event.clientX, event.clientY, event.timeStamp);

  if (!moved && Math.hypot(dx, dy) > DRAG_DEAD_ZONE) {
    moved = true;
    // 真正进入拖拽：取消未提交的换牌，并清掉还在回弹的下压量，保证 1:1 跟手
    cancelPendingAdvance();
    motionOf(dragId).press.set(0);
  }

  const motion = motionOf(dragId);
  // 拖拽期间直接跟随手指（弹簧在松手时才接管），倾角与抬升保持物理直觉。
  // 顶卡静止时保持水平，倾角只由水平位移临时驱动，松手后回到 0°。
  motion.x.set(dx);
  motion.y.set(dy);
  motion.rotate.set(clamp(dx * 0.06, -10, 10));
  const lift = Math.min(1, Math.hypot(dx, dy) / Math.max(60, size.width || 96));
  motion.scale.set(1 + lift * 0.05);
}

function endDrag(event: PointerEvent | null): void {
  const id = dragId;
  if (!id) return;
  if (event && pointerId !== event.pointerId) return;
  if (event) {
    lastX = event.clientX;
    lastY = event.clientY;
  }

  const motion = motionOf(id);
  const dx = lastX - startX;
  const dy = lastY - startY;
  const sampling = event
    ? velocity.read(event.timeStamp)
    : { vx: 0, vy: 0 };
  const vx = clamp(sampling.vx, -2200, 2200);
  const vy = clamp(sampling.vy, -2200, 2200);
  const distance = Math.hypot(dx, dy);
  const shouldAdvance =
    moved &&
    (distance > offsetThreshold() ||
      Math.abs(vx) > flingThreshold() ||
      Math.abs(vy) > flingThreshold());

  pointerId = null;
  dragId = null;
  isDragging.value = false;
  velocity.clear();

  if (shouldAdvance) {
    // 初速匹配：先注入手指末速，再换 activeId；随后 applyTargets 把这张卡的
    // 目标换成牌堆最后一层，弹簧会带着动量把它甩出去、再收进牌堆。
    motion.x.kick(vx);
    motion.y.kick(vy);
    motion.rotate.kick(vx * 0.03);
    motion.scale.kick(-Math.min(1400, Math.hypot(vx, vy)) * 0.00012);
    // 甩牌本身带着手指动量，直接换牌；不再叠加上一次下压前奏
    commitAdvance(1, isCardFocused());
    void nextTick(() => applyTargets());
  } else {
    const pose = stackPose(0, size.height);
    motion.x.setTarget(pose.x);
    motion.y.setTarget(pose.y);
    motion.rotate.setTarget(pose.rotate);
    motion.scale.setTarget(pose.scale);
    motion.opacity.setTarget(pose.opacity);
    // 未过阈值也保留一点回弹动量，避免「拖了一半突然被吸回去」的塑料感
    motion.x.kick(vx * 0.5);
    motion.y.kick(vy * 0.5);
    motion.rotate.kick(vx * 0.012);
  }

  if (moved) suppressNextClick();
}

function onPointerUp(event: PointerEvent): void {
  endDrag(event);
}

function onPointerCancel(): void {
  const id = dragId;
  if (!id) return;
  const motion = motionOf(id);
  const pose = stackPose(0, size.height);
  motion.x.setTarget(pose.x);
  motion.y.setTarget(pose.y);
  motion.rotate.setTarget(pose.rotate);
  motion.scale.setTarget(pose.scale);
  motion.opacity.setTarget(pose.opacity);

  dragId = null;
  pointerId = null;
  isDragging.value = false;
  velocity.clear();
  moved = false;
}

function onCardClick(id: string, depth: number): void {
  if (depth !== 0 || id !== props.activeId) return;
  if (suppressClick) {
    suppressClick = false;
    return;
  }
  // 点击/键盘激活都走同一路径：换牌后把焦点交给新顶卡。鼠标点击通常也会聚焦
  // 按钮，而 :focus-visible 的启发式只对键盘显形，所以不会给鼠标用户画焦点环。
  advance(1, true);
}

function onKeydown(event: KeyboardEvent): void {
  // Enter / Space 自己处理并 preventDefault：一部分 WebView 与自动化环境
  // 不会为聚焦按钮合成原生 click，自己兜住可保证键盘换牌稳定且只换一次。
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    suppressClick = false;
    advance(1, true);
    return;
  }
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
    event.preventDefault();
    suppressClick = false;
    advance(1, true);
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
    event.preventDefault();
    suppressClick = false;
    advance(-1, true);
  }
}

/* ---------------- 换牌 ----------------
   换牌分两拍：旧顶卡先以顶层姿态向下沉 2em；沉到最外端的瞬间才改 activeId
   ——z-index 降为底层、开始虚化、整副牌重排，随后它在底层弹回牌堆尾部归位。
   这样下压动作不会被新顶卡挡住，z-index 也不是「原地」切换。 */
function isCardFocused(): boolean {
  const el = document.activeElement;
  return el instanceof HTMLElement && el.classList.contains('ft-card');
}

let pendingTimer: ReturnType<typeof setTimeout> | undefined;

/** 取消尚未提交的换牌（真正开始拖拽时调用，避免延迟回调打断拖拽） */
function cancelPendingAdvance(): void {
  if (!pendingTimer) return;
  clearTimeout(pendingTimer);
  pendingTimer = undefined;
}

function commitAdvance(step: number, keepFocus: boolean): void {
  const { items } = props;
  if (items.length < 2) return;
  const found = items.findIndex((item) => item.id === props.activeId);
  const base = found < 0 ? 0 : found;
  const nextId = items[(base + step + items.length) % items.length].id;
  emit('update:activeId', nextId);
  // 换牌后旧顶卡变 disabled，浏览器会因此丢焦点；键盘/点击换牌时把焦点交给新顶卡，
  // 保证 Enter / 方向键可以连续操作（nextTick 等 DOM 更新完再 focus）。
  if (keepFocus) {
    void nextTick(() => cardEls.get(nextId)?.focus({ preventScroll: true }));
  }
  restartAutoplay();
}

function advance(step = 1, keepFocus = false): void {
  const { items } = props;
  if (items.length < 2 || pendingTimer) return;
  // reduced-motion 下 kick 被弹簧忽略，直接换牌，不做无意义的等待
  if (reducedMotion.value) {
    commitAdvance(step, keepFocus);
    return;
  }
  const peakMs = pressCard(props.activeId);
  // 首峰时刻 = 卡片沉到最外端的时刻：此刻再降 z-index、换牌、开始虚化
  pendingTimer = setTimeout(() => {
    pendingTimer = undefined;
    commitAdvance(step, keepFocus);
  }, peakMs);
}

/* ---------------- 自动轮播（悬停/拖拽/聚焦/页面隐藏暂停） ---------------- */
const hovered = ref(false);
const focused = ref(false);
const canRun = computed(
  () =>
    !hovered.value &&
    !focused.value &&
    !isDragging.value &&
    !reducedMotion.value &&
    props.items.length > 1,
);

let timer: ReturnType<typeof setInterval> | undefined;

function stopAutoplay(): void {
  if (!timer) return;
  clearInterval(timer);
  timer = undefined;
}

function restartAutoplay(): void {
  stopAutoplay();
  if (!canRun.value) return;
  timer = setInterval(() => advance(), props.intervalMs);
}

watch(canRun, restartAutoplay);

function onVisibility(): void {
  if (document.hidden) stopAutoplay();
  else restartAutoplay();
}

/* ---------------- 生命周期 ---------------- */
let observer: ResizeObserver | null = null;

onMounted(() => {
  measure();
  applyTargets(true);
  measured = true;
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(() => {
      measure();
      applyTargets(true);
    });
    if (deckRef.value) observer.observe(deckRef.value);
  }
  restartAutoplay();
  document.addEventListener('visibilitychange', onVisibility);
});

watch(
  rendered,
  () => {
    if (measured) applyTargets();
  },
  { flush: 'post' },
);

// 随机幅度/开关是公开 prop：改了就按新幅度重算即可（随机系数保持不变）
watch(
  [
    () => props.randomRotation,
    () => props.randomRotationAmount,
    () => props.randomRotationOriginOffset,
    () => props.randomRotationOriginOffsetAmount,
  ],
  () => {
    if (measured) applyTargets();
  },
);

onBeforeUnmount(() => {
  stopAutoplay();
  clearTimeout(suppressTimer);
  clearTimeout(pendingTimer);
  observer?.disconnect();
  observer = null;
  document.removeEventListener('visibilitychange', onVisibility);
  // 让仍在飞行的弹簧脱离全局 rAF 管线，避免卸载后空转
  for (const motion of motions.values()) {
    motion.x.snap();
    motion.y.snap();
    motion.rotate.snap();
    motion.scale.snap();
    motion.opacity.snap();
    motion.press.snap();
  }
  motions.clear();
  cardEls.clear();
  randomness.clear();
});

/* ---------------- 模板辅助 ---------------- */
function cardStyle(item: FeatureTagItem, depth: number): CSSProperties {
  return {
    '--card-tone': item.tone ?? 'var(--accent-2)',
    '--ft-depth': depth,
    zIndex: rendered.value.length - depth,
  } as CSSProperties;
}
</script>

<template>
  <span
    class="ft"
    role="group"
    aria-roledescription="卡片轮播"
    aria-label="站点特色"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
    @focusin="focused = true"
    @focusout="focused = false"
  >
    <span ref="deckRef" class="ft-deck">
      <button
        v-for="card in rendered"
        :key="card.item.id"
        :ref="(el) => setCardEl(card.item.id, el)"
        type="button"
        class="ft-card"
        :class="{ 'is-top': card.depth === 0, 'is-dragging': isDragging && card.depth === 0 }"
        :style="cardStyle(card.item, card.depth)"
        :disabled="card.depth > 0"
        :tabindex="card.depth === 0 ? 0 : -1"
        :aria-hidden="card.depth > 0 ? 'true' : undefined"
        :aria-label="
          card.depth === 0
            ? `当前特色：${card.item.label}，点击、拖动或左右滑动切换`
            : undefined
        "
        @pointerdown="onPointerDown($event, card.item.id, card.depth)"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerCancel"
        @click="onCardClick(card.item.id, card.depth)"
        @keydown="onKeydown"
      >
        <span class="ft-label">{{ card.item.label }}</span>
      </button>
    </span>
    <span class="ft-live" aria-live="polite">{{ focused ? activeLabel : '' }}</span>
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

/* 同格叠放：grid 让容器自然取「最宽一张卡」的尺寸，transform 不参与布局 */
.ft-deck {
  display: grid;
}

/* ---- 卡片本体：点题色实底 + 深色文字（--on-accent） ----
   每张卡的 --card-tone 由页面传入的令牌表达式决定；轮播一轮经过五种主题色。 */
.ft-card {
  grid-area: 1 / 1;
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 2.1em;
  padding: 0 0.9em;
  border: 1px solid color-mix(in srgb, var(--card-tone, var(--accent-2)) 62%, var(--line));
  border-radius: var(--radius-full);
  background: var(--card-tone, var(--accent-2));
  color: var(--on-accent);
  font: inherit;
  font-size: inherit;
  line-height: 1;
  box-shadow:
    var(--shadow-1),
    0 10px 22px -14px color-mix(in srgb, var(--card-tone, var(--accent-2)) 70%, transparent);
  transform-origin: 50% 85%;
  will-change: transform, opacity;
  /* 非顶卡逐层虚化：--ft-depth 由 cardStyle 写入，每深一层 +0.03em。
     blur 直接吃 em（随身份行字号整体缩放），小屏大屏的景深比例一致；
     换牌时 depth 变化交给过渡，卡片在飞向底层的过程中逐渐虚掉。
     曲线与弹簧同风格（kexie 签名过冲曲线），虚化/清晰化都留一点余韵。 */
  filter: blur(calc(var(--ft-depth, 0) * 0.03em));
  transition: filter var(--dur-slow) cubic-bezier(0.34, 1.4, 0.5, 1);
  cursor: grab;
  -webkit-tap-highlight-color: transparent;
}

/* 只有最上面的卡接指针；后方卡 disabled + pointer-events: none */
.ft-card.is-top {
  touch-action: none;
}

.ft-card.is-dragging {
  cursor: grabbing;
}

.ft-card:disabled {
  pointer-events: none;
  cursor: default;
}

.ft-card:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}

.ft-label {
  font-family: var(--font-display);
  font-size: 1em;
  font-weight: 700;
  letter-spacing: 0.01em;
  white-space: nowrap;
}

/* 换牌播报：视觉隐藏，仅屏幕阅读器可听（自动轮播在聚焦/悬停时已暂停） */
.ft-live {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

@media (prefers-reduced-motion: reduce) {
  .ft-card {
    cursor: pointer;
    transition: none;
  }
}

@media (hover: none) {
  .ft-card.is-top {
    cursor: default;
  }
}
</style>
