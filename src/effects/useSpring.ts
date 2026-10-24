import { ref, type Ref } from 'vue';

/**
 * useSpring —— 自实现的 rAF 弹簧动画工具（微超伸），动效侧共用。
 *
 * - 零第三方依赖（package.json 无 motion 系依赖），单根共享 rAF 管线；
 * - 不进 effects/index.ts 的冻结导出桶（契约 §3.1 逐字清单，不得增删），
 *   消费方以 `@/effects/useSpring` 直连导入；
 * - 物理模型：质量-弹簧-阻尼，semi-implicit Euler、固定 1/240s 子步积分；
 *   单帧 dt 钳制 64ms（标签页隐藏时 rAF 自动暂停，恢复后不爆炸）；
 * - 「微超伸」默认预设 SPRING_MICRO_OVERSHOOT：k=320、c=24、m=1
 *   → ω0=√(k/m)≈17.9 rad/s，ζ=c/(2√(k·m))≈0.671
 *   → 理论过冲 ≈ exp(-πζ/√(1-ζ²)) ≈ 5.8%，≈0.24s 到峰、≈0.33s 回到 2% 带内；
 * - prefers-reduced-motion：模块级单例监听；reduced 时 setTarget()/kick()
 *   退化为瞬时跳变，运行中的弹簧在系统切换瞬间全部吸附到目标（snapAll）。
 */

export interface SpringConfig {
  /** 刚度 k（越大到位越快） */
  stiffness: number;
  /** 阻尼系数 c（< 2√(k·m) 时欠阻尼、出现过冲） */
  damping: number;
  /** 质量 m，默认 1 */
  mass?: number;
}

/** 微超伸预设（FeatureStack 卡片换位 / SwapText 容器宽度共用）：k=320 c=24 m=1 */
export const SPRING_MICRO_OVERSHOOT: SpringConfig = { stiffness: 320, damping: 24, mass: 1 };

/* ---------------- prefers-reduced-motion（模块级单例） ---------------- */

const reduceQuery: MediaQueryList | null =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;

const reducedMotionRef = ref(reduceQuery?.matches ?? false);

if (reduceQuery) {
  const onChange = (e: MediaQueryListEvent): void => {
    reducedMotionRef.value = e.matches;
    if (e.matches) snapAll();
  };
  // 旧 Safari 只有 addListener
  if (typeof reduceQuery.addEventListener === 'function') {
    reduceQuery.addEventListener('change', onChange);
  } else {
    reduceQuery.addListener(onChange);
  }
}

/** 是否偏好减弱动效（响应式；动画触发处读它分支，弹簧内部也会自动退化） */
export const reducedMotion: Readonly<Ref<boolean>> = reducedMotionRef;

/* ---------------- 全局共享 rAF 循环（所有弹簧一根管线） ---------------- */

const active = new Set<SpringValue>();
let rafId = 0;
let lastTime = 0;

function ensureLoop(): void {
  if (rafId) return;
  lastTime = performance.now();
  rafId = requestAnimationFrame(loop);
}

function loop(now: number): void {
  rafId = 0;
  const dt = Math.min(Math.max(now - lastTime, 0), 64) / 1000;
  lastTime = now;
  for (const spring of [...active]) {
    if (!spring.tick(dt)) active.delete(spring);
  }
  if (active.size > 0) rafId = requestAnimationFrame(loop);
}

/** 立即吸附所有运行中的弹簧到各自目标（reduced-motion 开启瞬间调用） */
export function snapAll(): void {
  for (const spring of [...active]) spring.snap();
  active.clear();
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
}

/* ---------------- 弹簧值 ---------------- */

export class SpringValue {
  /** 当前值（只读语义；改动请走 set/setTarget） */
  value: number;
  /** 当前速度（单位/s） */
  velocity = 0;
  /** 目标值 */
  target: number;
  /** 整定精度：|value-target| < precision 且 |velocity| < 32·precision 即静止 */
  precision: number;
  /** 值变化回调（每帧；把值写回样式在这里做） */
  onUpdate: (() => void) | null = null;

  private readonly stiffness: number;
  private readonly damping: number;
  private readonly mass: number;
  private joined = false;

  constructor(initial: number, config: SpringConfig = SPRING_MICRO_OVERSHOOT, precision = 1e-3) {
    this.value = initial;
    this.target = initial;
    this.precision = precision;
    this.stiffness = config.stiffness;
    this.damping = config.damping;
    this.mass = config.mass ?? 1;
  }

  /** 瞬时置值（目标同步、清零速度、停止动画） */
  set(value: number): void {
    this.value = value;
    this.target = value;
    this.velocity = 0;
    this.leave();
    this.emit();
  }

  /** 换目标：保留当前位置与速度继续滑向新目标（reduced-motion 退化为瞬时跳变） */
  setTarget(target: number): void {
    this.target = target;
    if (reducedMotionRef.value) {
      this.snap();
      this.emit();
      return;
    }
    this.join();
  }

  /** 注入速度脉冲（单位/s）；reduced-motion 时忽略 */
  kick(velocity: number): void {
    if (reducedMotionRef.value) return;
    this.velocity = velocity;
    this.join();
  }

  isSettled(): boolean {
    return !this.joined;
  }

  /** 吸附到目标并停止 */
  snap(): void {
    this.value = this.target;
    this.velocity = 0;
    this.leave();
  }

  /** 供全局循环调用：推进 dt 秒；返回 false 表示已整定（循环会摘除） */
  tick(dt: number): boolean {
    if (reducedMotionRef.value) {
      this.snap();
      this.emit();
      return false;
    }
    let remaining = dt;
    while (remaining > 1e-6) {
      const h = Math.min(1 / 240, remaining);
      const acceleration =
        (-(this.value - this.target) * this.stiffness - this.velocity * this.damping) / this.mass;
      this.velocity += acceleration * h;
      this.value += this.velocity * h;
      remaining -= h;
    }
    const settled =
      Math.abs(this.value - this.target) < this.precision &&
      Math.abs(this.velocity) < this.precision * 32;
    if (settled) this.snap();
    this.emit();
    return !settled;
  }

  private join(): void {
    if (this.joined) return;
    this.joined = true;
    active.add(this);
    ensureLoop();
  }

  private leave(): void {
    if (!this.joined) return;
    this.joined = false;
    active.delete(this);
  }

  private emit(): void {
    this.onUpdate?.();
  }
}
