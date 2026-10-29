<script setup lang="ts">
/**
 * Rein 液态玻璃的「滤镜定义」——实验室复刻，来源 lumenShen/Rein @ main（MIT）。
 *
 * 原版把滤镜定义从 GlassSurface 里拆了出来（src/components/common/GlassFilter.vue），
 * 理由是折射的名单不止 GlassSurface：四条悬浮条、沉浸层控制层、AI 底栏输入条
 * 都要拿到同一段 `url(#id)`。滤镜链抄成两份必然漂，所以只有这一份实现。
 * 本文件保留这条边界：ReinGlassSurface 只负责表面，滤镜定义在这里。
 *
 * 与 Rein 原版的差异（只删了实验室不需要的外部系统）：
 *   - 原版参数读 system/glassParams（画质页可调 + localStorage 会话）；这里由
 *     GlassMaterial 直接传入，方便调参台联动；
 *   - 原版 `enabled` 由 system/perf 的 liquidGlass 档位控制；这里由父组件的
 *     运行时能力检测 + prefers-reduced-motion 控制；
 *   - 原版支持 `source` / 静态 `w`/`h` 把滤镜借给外部表面；实验室只服务自己
 *     根元素，量尺固定为父元素。
 *
 * 滤镜链本身没有改动：贴图 → 一次位移 → 收尾柔化，3 个原语。
 */
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import type { GlassMaterial } from '../glass-material';

const props = withDefaults(
  defineProps<{
    /** 滤镜 id：ReinGlassSurface 在自己的 backdrop-filter 里用 url(#id) 引用 */
    id: string;
    /** 材质参数（由父级透传；调参台改的就是这一份） */
    params: GlassMaterial;
    /** 表面的圆角（只参与重烘指纹；贴图里的实际圆角仍取宿主计算值） */
    radius?: number | string;
    /** 折射分支是否活着（v-show）：不折射时整块定义不参与绘制 */
    enabled?: boolean;
    /** 位移贴图里两道通道渐变的混合方式 */
    mixBlendMode?: string;
    xChannel?: 'R' | 'G' | 'B';
    yChannel?: 'R' | 'G' | 'B';
  }>(),
  {
    radius: 0,
    enabled: true,
    mixBlendMode: 'difference',
    xChannel: 'R',
    yChannel: 'G',
  },
);

const el = ref<SVGSVGElement | null>(null);

/** 位移贴图缓存：指纹 → data URI。尺寸 + 参数相同的玻璃拿到同一个字符串。 */
const MAP_CACHE = new Map<string, string>();

function mapKeyOf(w: number, h: number, rx: number): string {
  const p = props.params;
  return [
    w,
    h,
    rx,
    props.mixBlendMode,
    p.borderWidth,
    p.brightness,
    p.opacity,
    p.blur,
    p.mapScale,
  ].join('|');
}
let resizeObserver: ResizeObserver | null = null;
let rafId = 0;
/** 上一次烘贴图用的指纹，以及当时那张贴图挂在哪个元素上（守卫重烘） */
let mapEl: Element | null = null;
let mapKey = '';

/** 写入前先比旧值：SVG 属性写入不比较新旧，写一次就是一次滤镜失效 */
function writeAttr(node: Element, name: string, value: string): void {
  if (node.getAttribute(name) !== value) node.setAttribute(name, value);
}

/** 量尺：本组件被放在那块玻璃里，父元素就是表面本体 */
function host(): HTMLElement | null {
  return (el.value?.parentElement as HTMLElement | null) ?? null;
}

/**
 * 贴图里的圆角必须是长度：优先取计算值（调用方可能给 50% / var(--radius-full)），
 * 取不到再按数字/字符串解析。最后夹到短边的一半。只在指纹变了时才调用：
 * getComputedStyle 是一次强制样式结算。
 */
function radiusPx(w: number, h: number): number {
  const max = Math.min(w, h) / 2;
  const node = host();
  const computed = node ? getComputedStyle(node).borderRadius : '';
  const raw = computed.trim().split(/\s+/)[0] || '0';
  const px = raw.endsWith('%') ? (max * 2 * parseFloat(raw)) / 100 : parseFloat(raw) || 0;
  return Math.max(0, Math.min(px, max));
}

/**
 * 位移贴图：底黑；叠一层「左→右 红渐隐」与一层「上→下 蓝渐隐」，再在内缩的
 * 圆角亮块上做 blur —— 亮块的模糊半径就是玻璃的「厚度」。
 * 根 svg 的 width/height 按 mapScale 缩小，feImage 再用 preserveAspectRatio="none"
 * 拉回原尺寸：贴图是平滑渐变，降采样误差落回亚像素，几乎不改变观感。
 */
function mapDataUri(w: number, h: number, rx: number): string {
  const key = mapKeyOf(w, h, rx);
  const hit = MAP_CACHE.get(key);
  if (hit !== undefined) return hit;

  const p = props.params;
  const edge = Math.min(w, h) * (p.borderWidth * 0.5);
  const scale = Math.max(1, Math.round(p.mapScale));
  const svg = `
      <svg viewBox="0 0 ${w} ${h}" width="${w / scale}" height="${h / scale}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="red-grad" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stop-color="#0000"/>
            <stop offset="100%" stop-color="red"/>
          </linearGradient>
          <linearGradient id="blue-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#0000"/>
            <stop offset="100%" stop-color="blue"/>
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="${w}" height="${h}" fill="black"></rect>
        <rect x="0" y="0" width="${w}" height="${h}" rx="${rx}" fill="url(#red-grad)" />
        <rect x="0" y="0" width="${w}" height="${h}" rx="${rx}" fill="url(#blue-grad)" style="mix-blend-mode: ${props.mixBlendMode}" />
        <rect x="${edge}" y="${edge}" width="${w - edge * 2}" height="${h - edge * 2}" rx="${rx}" fill="hsl(0 0% ${p.brightness}% / ${p.opacity})" style="filter:blur(${p.blur}px)" />
      </svg>
    `;
  const uri = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  // 拖窗口 / 拖滑杆时尺寸会连续变，每次都是一个新键 —— 超上限整份清掉。
  if (MAP_CACHE.size > 64) MAP_CACHE.clear();
  MAP_CACHE.set(key, uri);
  return uri;
}

function updateMap(): void {
  if (!props.enabled) return;
  const img = el.value?.querySelector('feImage');
  if (!img) return;
  const rect = host()?.getBoundingClientRect();
  // 元素还没布局（宽高为 0）时别生成贴图：0 宽的 viewBox 会让位移量算出 NaN
  const w = Math.max(1, Math.round(rect?.width ?? 0));
  const h = Math.max(1, Math.round(rect?.height ?? 0));
  const p = props.params;
  // 指纹里放圆角的 prop 写法而不是解析后的像素：解析要强制样式结算，只在真要重烘时才付
  const key = [
    w,
    h,
    props.radius,
    props.mixBlendMode,
    p.borderWidth,
    p.brightness,
    p.opacity,
    p.blur,
    p.mapScale,
  ].join('|');
  // 尺寸与参数都没动、贴图也还挂在同一个元素上，就别重烘
  if (img === mapEl && key === mapKey) return;
  mapEl = img;
  mapKey = key;
  writeAttr(img, 'href', mapDataUri(w, h, radiusPx(w, h)));
}

function updateFilter(): void {
  if (!props.enabled) return;
  const root = el.value;
  if (!root) return;
  const dm = root.querySelector('feDisplacementMap');
  if (dm) {
    writeAttr(dm, 'xChannelSelector', props.xChannel);
    writeAttr(dm, 'yChannelSelector', props.yChannel);
    writeAttr(dm, 'scale', String(props.params.distortionScale));
  }
  const blur = root.querySelector('feGaussianBlur');
  if (blur) writeAttr(blur, 'stdDeviation', String(props.params.displace));
}

/** 贴图重烘与滤镜重写合并到一帧一次：拖滑杆时每个 input 事件都会触发一遍 */
function schedule(): void {
  if (rafId) return;
  rafId = requestAnimationFrame(() => {
    rafId = 0;
    updateMap();
    updateFilter();
  });
}

function observeHost(): void {
  resizeObserver?.disconnect();
  resizeObserver = null;
  if (!props.enabled) return;
  const node = host();
  if (!node || typeof ResizeObserver === 'undefined') return;
  resizeObserver = new ResizeObserver(() => schedule());
  resizeObserver.observe(node);
}

watch(
  () => [
    props.enabled,
    props.radius,
    props.mixBlendMode,
    props.xChannel,
    props.yChannel,
    props.params.borderWidth,
    props.params.brightness,
    props.params.opacity,
    props.params.blur,
    props.params.mapScale,
    props.params.distortionScale,
    props.params.displace,
  ],
  () => {
    observeHost();
    schedule();
  },
  { flush: 'post' },
);

onMounted(() => {
  void nextTick(() => {
    observeHost();
    updateMap();
    updateFilter();
  });
});

onUnmounted(() => {
  resizeObserver?.disconnect();
  if (rafId) cancelAnimationFrame(rafId);
});
</script>

<template>
  <!-- 滤镜定义本身不参与绘制：opacity 0 + 绝对定位；真正生效的是别处
       `backdrop-filter: url(#id)` 对它的引用。整份定义只有这一条链。 -->
  <svg v-show="enabled" ref="el" class="gdefs" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <filter
        :id="props.id"
        color-interpolation-filters="sRGB"
        x="0%"
        y="0%"
        width="100%"
        height="100%"
      >
        <feImage x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="map" />
        <feDisplacementMap in="SourceGraphic" in2="map" result="output" />
        <feGaussianBlur in="output" stdDeviation="0.7" />
      </filter>
    </defs>
  </svg>
</template>

<style scoped>
.gdefs {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  pointer-events: none;
  z-index: -1;
}
</style>
