/*
 * stackMotion —— 身份行卡片堆的纯数学/采样工具（无 DOM、无 Vue 依赖）。
 *
 * 单独成文件的原因：FeatureTag.vue 只负责「指针 + 生命周期 + 模板」，
 * 牌堆几何与甩出速度采样放在这里，改弹簧手感时不必动组件结构。
 *
 * 坐标约定（px / deg）：
 *   - depth 0 = 最上面的可拖拽卡；depth 越大越靠后；
 *   - 后方卡片按 depth 逐层缩小、下移、交替微旋，形成扇形牌堆；
 *   - 所有值最终交给 SpringValue，由 useSpring 的统一 rAF 管线推进。
 */
import { SPRING_SNAPPY, type SpringConfig } from '@/effects/useSpring';

/**
 * 牌堆专用弹簧：直接复用 SPRING_SNAPPY（k=480 / c=27 / m=1）。
 *   ω0 = √480 ≈ 21.9 rad/s，ζ = 27 / (2√480) ≈ 0.616；
 *   ≈7.6% 过冲、≈179ms 到峰、≈270ms 回到 2% 带内（与 useSpring 的数值仿真一致）。
 * 换牌时各层 depth 同时变化，牌要「弹过头一点再收住」才有实体卡的手感；
 * 该预设仍在项目 5~8% 微超伸带内，5 张卡一起重排也不至于来回晃。
 */
export const SPRING_STACK: SpringConfig = SPRING_SNAPPY;

export interface StackPose {
  /** 水平位移（px），后方卡片左右交替微错位 */
  x: number;
  /** 垂直位移（px），越靠后越往下压 */
  y: number;
  /** 旋转角（deg），交替方向扇开 */
  rotate: number;
  /** 缩放 */
  scale: number;
  /** 不透明度：后方卡片逐层变淡，但保底可辨认 */
  opacity: number;
}

const DEPTH_SCALE_STEP = 0.055;
const DEPTH_SCALE_MIN = 0.78;
const DEPTH_ROTATE_STEP = 1.8;
const DEPTH_MAX_OFFSET_PX = 2.4;

/**
 * 按深度算牌堆姿态。
 * `cardHeight` 用来把纵向错位换算成与胶囊成比例的 px（字号随视口 clamp 变化，
 * 固定 px 会让小屏堆不开、大屏挤成一坨）。
 * `randomRotation` 是这张卡自己的固定随机倾角（deg），叠加在逐层交替的
 * 扇形角上；由调用方按卡 id 保存，换牌重排时不重新抽签，牌才有「性格」。
 * 顶卡（depth 0）的随机倾角应由调用方传 0：它和身份行文字同排，保持水平。
 */
export function stackPose(
  depth: number,
  cardHeight: number,
  randomRotation = 0,
): StackPose {
  const d = Math.max(0, depth);
  const side = d % 2 === 0 ? 1 : -1;
  return {
    x: side * Math.min(DEPTH_MAX_OFFSET_PX, d * 0.55),
    y: d * Math.max(1.1, cardHeight * 0.055),
    rotate: side * d * DEPTH_ROTATE_STEP + randomRotation,
    scale: Math.max(DEPTH_SCALE_MIN, 1 - d * DEPTH_SCALE_STEP),
    opacity: d === 0 ? 1 : Math.max(0.42, 0.88 - (d - 1) * 0.13),
  };
}

export interface PointerSample {
  t: number;
  x: number;
  y: number;
}

const SAMPLE_WINDOW_MS = 120;
const STALE_MS = 70;
const MAX_SAMPLES = 8;

/**
 * 指针末速采样器。
 *
 * pointermove 的采样频率随设备而异，直接取「最后两点」会被一帧抖动放大成
 * 几千 px/s 的假甩出。这里保留最近 120ms 的样本、按新鲜度加权求平均；
 * 松手前如果已经停顿超过 70ms，判定速度归零（拿着不动再松手不应触发换牌）。
 */
export class PointerVelocity {
  private samples: PointerSample[] = [];

  reset(x: number, y: number, t: number): void {
    this.samples = [{ t, x, y }];
  }

  sample(x: number, y: number, t: number): void {
    const samples = this.samples;
    samples.push({ t, x, y });
    while (samples.length > 2 && t - samples[0].t > SAMPLE_WINDOW_MS) samples.shift();
    if (samples.length > MAX_SAMPLES) samples.splice(0, samples.length - MAX_SAMPLES);
  }

  /** 读取末速（px/s）；`now` 用事件 timeStamp，和 sample 同一时基 */
  read(now: number): { vx: number; vy: number } {
    const samples = this.samples;
    if (samples.length < 2) return { vx: 0, vy: 0 };
    if (now - samples[samples.length - 1].t > STALE_MS) return { vx: 0, vy: 0 };

    let vx = 0;
    let vy = 0;
    let weightSum = 0;
    for (let i = 1; i < samples.length; i += 1) {
      const dt = (samples[i].t - samples[i - 1].t) / 1000;
      if (dt <= 0) continue;
      const weight = i; // 越新的样本权重越大
      vx += ((samples[i].x - samples[i - 1].x) / dt) * weight;
      vy += ((samples[i].y - samples[i - 1].y) / dt) * weight;
      weightSum += weight;
    }
    if (!weightSum) return { vx: 0, vy: 0 };
    return { vx: vx / weightSum, vy: vy / weightSum };
  }

  clear(): void {
    this.samples = [];
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export interface ImpulseResponse {
  /** 单位初速下的首峰位移（px，用于标定校验） */
  displacement: number;
  /** 首峰出现的时间（秒） */
  peakTime: number;
  /** 让首峰达到指定位移所需的初速（px/s） */
  velocity: number;
}

/**
 * 把「一记冲量要让弹簧跑多远、跑到最外端要多久」翻译成初速与时间。
 *
 * 解析解首峰是 v/ωd · e^{-ζω0 t峰} · sin(ωd t峰)，但 SpringValue 走的是
 * 1/240s 子步的 semi-implicit Euler，数值阻尼会让实际首峰比解析解小约 10%。
 * 这里直接用同一套积分器模拟单位初速的自由振动，取真实首峰及其时刻，再反推
 * 初速；刚度/阻尼预设变化时换算自动跟随，不必手调魔数。
 *
 * 用途：换牌时给顶卡的 press 弹簧一记向下 kick，让它沉到指定深度，并告诉调用方
 * 何时到达最外端（此刻再降 z-index / 重排）。
 */
export function impulseResponse(displacement: number, config: SpringConfig): ImpulseResponse {
  const mass = config.mass ?? 1;
  const h = 1 / 240;
  let x = 0;
  let v = 1;
  let peak = 0;
  let peakTime = 0;
  let time = 0;
  // 模拟到首次回到 0（下沉结束、开始回弹）为止，记录最大下沉量及其时刻
  for (let i = 0; i < 480; i += 1) {
    const acceleration = (-config.stiffness * x - config.damping * v) / mass;
    v += acceleration * h;
    x += v * h;
    time += h;
    if (x > peak) {
      peak = x;
      peakTime = time;
    }
    if (i > 10 && x <= 0) break;
  }
  return {
    displacement: peak,
    peakTime,
    velocity: peak > 0 ? displacement / peak : 0,
  };
}
