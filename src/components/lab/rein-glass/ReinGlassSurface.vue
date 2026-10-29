<script setup lang="ts">
/**
 * Rein 液态玻璃的「表面」——实验室复刻，来源 lumenShen/Rein @ main（MIT）。
 *
 * 原版（src/components/common/GlassSurface.vue）与 GlassFilter 拆开：
 * 表面只负责尺寸 / 圆角 / 底色 / 退化分支，滤镜定义由 GlassFilter 渲染，
 * 两者通过 `url(#id)` 相连。这样同一段滤镜链可以借给不是 GlassSurface 的
 * 悬浮条、底栏输入条，避免「两份定义必然漂」。
 *
 * 与 Rein 原版的差异：
 *   1. 折射开关：原版由 system/perf 的 liquidGlass 档位决定；实验室改为运行时
 *      能力检测（`backdrop-filter: url()` 只有 Chromium 系认）+ prefers-reduced-motion，
 *      与 Codrift 版同一条判定，保证两块玻璃在同一台机器上同时有折射或同时退化；
 *   2. 材质默认值：原版读 system/glassParams（可调 + localStorage）；这里直接取
 *      glass-material.ts 的 REIN_GLASS 出厂组，调用方仍可逐项覆盖；
 *   3. 令牌：原版的 --glass-fill / --line / --surface 映射到本站 --glass-*，
 *      缺失时用暗色字面量兜底；
 *   4. 主题：原版跟随 prefers-color-scheme；这里支持 tint='auto' 跟随站点
 *      html[data-theme]（实验室默认用 tint='dark' 压在彩色场景上）。
 *
 * 退化（与 Codrift 版同语义）：
 *   - 不认 `backdrop-filter: url()` 或 reduced-motion → 普通毛玻璃；
 *   - 连 backdrop-filter 都不支持 → 半透明实底 + 内描边；
 *   - reduced-transparency → 近实底。
 */
import { computed, onMounted, onUnmounted, ref } from 'vue';
import ReinGlassFilter from './ReinGlassFilter.vue';
import { REIN_GLASS, type GlassMaterial } from '../glass-material';

export interface ReinGlassSurfaceProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: number | string;
  borderWidth?: number;
  brightness?: number;
  opacity?: number;
  blur?: number;
  mapScale?: number;
  distortionScale?: number;
  displace?: number;
  saturation?: number;
  backgroundOpacity?: number;
  xChannel?: 'R' | 'G' | 'B';
  yChannel?: 'R' | 'G' | 'B';
  mixBlendMode?: string;
  /** auto 跟随站点主题；dark / light 强制 */
  tint?: 'auto' | 'light' | 'dark';
  /** 折射分支的底色；缺省按 tint 取半透明黑 / 白 */
  fill?: string;
  style?: Record<string, string>;
}

const props = withDefaults(defineProps<ReinGlassSurfaceProps>(), {
  width: '100%',
  height: '100%',
  borderRadius: 50,
  ...REIN_GLASS,
  xChannel: 'R',
  yChannel: 'G',
  mixBlendMode: 'difference',
  tint: 'auto',
  fill: '',
  style: () => ({}),
});

/** 每个实例独立的 id：同一个页面可以并存多块玻璃，滤镜定义不能串 */
const uid = Math.random().toString(36).slice(2, 12);
const filterId = `rein-glass-filter-${uid}`;

/* ---------- 折射开关：运行时能力检测（与 Codrift 版同一判定） ---------- */
let svgBackdropCache: boolean | null = null;

function supportsSvgBackdrop(): boolean {
  if (svgBackdropCache !== null) return svgBackdropCache;
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return (svgBackdropCache = false);
  }
  const ua = navigator.userAgent;
  if ((/Safari/.test(ua) && !/Chrome/.test(ua)) || /Firefox/.test(ua)) {
    return (svgBackdropCache = false);
  }
  try {
    const probe = document.createElement('div');
    probe.style.setProperty('backdrop-filter', 'url(#rein-glass-probe)');
    svgBackdropCache = probe.style.getPropertyValue('backdrop-filter') !== '';
  } catch {
    svgBackdropCache = false;
  }
  return svgBackdropCache;
}

const reducedMotion = ref(
  typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false,
);

function readSiteThemeDark(): boolean {
  if (typeof document === 'undefined') return true;
  return document.documentElement.dataset.theme !== 'light';
}

const isDarkMode = ref(readSiteThemeDark());

const canRefract = computed(() => supportsSvgBackdrop() && !reducedMotion.value);

/** 玻璃压暗还是提亮：auto 跟站点主题，dark / light 由调用方指定 */
const darkTint = computed(() => (props.tint === 'auto' ? isDarkMode.value : props.tint === 'dark'));

/** 交给 GlassFilter 的材质参数（逐项透传，调参台改值时父级重渲染） */
const params = computed<GlassMaterial>(() => ({
  borderWidth: props.borderWidth,
  brightness: props.brightness,
  opacity: props.opacity,
  blur: props.blur,
  mapScale: props.mapScale,
  distortionScale: props.distortionScale,
  displace: props.displace,
  saturation: props.saturation,
  backgroundOpacity: props.backgroundOpacity,
}));

function length(value: string | number): string {
  return typeof value === 'number' ? `${value}px` : value;
}

const rootStyle = computed<Record<string, string>>(() => {
  const base: Record<string, string> = {
    width: length(props.width),
    height: length(props.height),
    borderRadius: length(props.borderRadius),
  };
  if (!canRefract.value) return base;
  const fallbackFill = darkTint.value
    ? `hsl(0 0% 0% / ${props.backgroundOpacity})`
    : `hsl(0 0% 100% / ${props.backgroundOpacity})`;
  return {
    ...base,
    background: props.fill || fallbackFill,
    backdropFilter: `url(#${filterId}) saturate(${props.saturation})`,
    WebkitBackdropFilter: `url(#${filterId}) saturate(${props.saturation})`,
  };
});

let disposeMedia: (() => void) | null = null;

onMounted(() => {
  const themeObserver = new MutationObserver(() => {
    isDarkMode.value = readSiteThemeDark();
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });

  const motionMq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const onMotion = (e: MediaQueryListEvent): void => {
    reducedMotion.value = e.matches;
  };
  motionMq.addEventListener('change', onMotion);

  disposeMedia = (): void => {
    themeObserver.disconnect();
    motionMq.removeEventListener('change', onMotion);
  };
});

onUnmounted(() => {
  disposeMedia?.();
});
</script>

<template>
  <div class="rein-glass" :style="[rootStyle, props.style]">
    <ReinGlassFilter
      :id="filterId"
      :params="params"
      :radius="props.borderRadius"
      :enabled="canRefract"
      :mix-blend-mode="props.mixBlendMode"
      :x-channel="props.xChannel"
      :y-channel="props.yChannel"
    />

    <div class="gbody">
      <slot />
    </div>
  </div>
</template>

<style scoped>
/* 表面本体：折射或退化都发生在这个盒子上，圆角与尺寸由调用方给 */
.rein-glass {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-sizing: border-box;
  /* 退化分支：普通毛玻璃 + 内描边；不认 backdrop-filter 的内核会丢弃模糊声明，
     剩下半透明实底 —— 与 Codrift 版的第三档退化同语义。 */
  background: var(--glass-fallback-fill, rgb(8 14 28 / 0.74));
  border: 1px solid var(--glass-border, rgb(160 190 240 / 0.2));
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  /* 光学层与 Codrift 版共用同一套 --glass-* 令牌：实验室比较的是材质参数
     与封装，不是两套皮肤。 */
  box-shadow:
    var(--glass-shadow, 0 10px 36px rgb(2 6 16 / 0.5)),
    var(--glass-halo, 0 -1px 20px -8px rgb(255 255 255 / 0.3)),
    inset 0 1px 0 0 var(--glass-rim-hi, rgb(255 255 255 / 0.6)),
    inset 0 -1px 0 0 var(--glass-rim-lo, rgb(255 255 255 / 0.16)),
    inset 0 14px 22px -16px var(--glass-sheen, rgb(255 255 255 / 0.26)),
    inset 0 0 0 1px var(--glass-rim-2, rgb(255 255 255 / 0.3)),
    inset 0 1px 10px -2px var(--glass-caustic, rgb(255 255 255 / 0.22));
  transition: opacity 0.2s ease-out;
}

@media (prefers-reduced-transparency: reduce) {
  .rein-glass {
    background: var(--glass-solid, rgb(8 14 28 / 0.92));
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    border-color: var(--glass-border-strong, rgb(160 190 240 / 0.34));
    box-shadow:
      var(--glass-shadow, 0 10px 36px rgb(2 6 16 / 0.5)),
      inset 0 0 0 1px var(--glass-rim-2, rgb(255 255 255 / 0.3));
  }
}

.gbody {
  position: relative;
  z-index: 1;
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
}
</style>
