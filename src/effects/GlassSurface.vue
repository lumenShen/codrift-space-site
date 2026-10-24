<script setup lang="ts">
/**
 * 液态玻璃表面（liquid glass）——「厚边折射、透心清晰」的那层玻璃。
 * 自包含单文件移植版：表面 + 滤镜定义合成一个组件，唯一的 import 来自 vue 本身，
 * 不依赖 `@/` 别名、画质档位体系或任何设计令牌，放进任何 Vue 3 + TS 项目即可用。
 *
 * 来源与许可：
 *   - 上游：vue-bits 的 GlassSurface（https://vue-bits.dev/r/GlassSurface），MIT License；
 *   - 本文件移植自 Rein 仓库的本地化版（MIT）：src/components/common/GlassSurface.vue +
 *     src/components/common/GlassFilter.vue 合并 —— 滤镜链只有这一份实现，
 *     「两份定义必然漂」的教训在单文件里自然消失。
 *
 * 折射是用 SVG 位移滤镜画出来的，四步：
 *   1. 按元素实际尺寸生成一张边缘梯度图（data URI）：底黑，叠一层「左→右 红渐隐」，
 *      再叠一层「上→下 蓝渐隐」，最后内缩一块圆角亮块（它的模糊半径就是玻璃的「厚度」）；
 *   2. feDisplacementMap 拿这张图当位移贴图，对**背景**做位移
 *      （xChannelSelector=R / yChannelSelector=G）；
 *   3. 边缘因此被拉扯出折射，中心因为梯度为零保持原样，看起来就是一整块有厚度的玻璃；
 *   4. 通过 `backdrop-filter: url(#filterId) saturate(...)` 作用在元素自身：
 *      它折射的是**元素背后的真实内容**（照片、列表、任意 DOM），不是一张贴图。
 *
 * ---------- 相对 Rein 版的移植改动 ----------
 *   1. GlassFilter 并入本组件：量尺永远是自己的根元素（Rein 版还支持把滤镜借给
 *      外部表面 —— `source` / 静态 `w`/`h` 那套入口随之删掉，本仓没有那种调用方）；
 *   2. 折射开关改为**运行时能力检测**（Rein 用 system/perf 的画质档位决定）：
 *      - 先探测 `backdrop-filter: url()`：Chromium 系独有；Safari / Firefox 会**静默
 *        忽略**整条声明，只靠解析器探测抓不到这种「留着声明但不渲染」，所以仍要先
 *        按 UA 排掉这两个内核；
 *      - 再叠加 prefers-reduced-motion：系统要求减弱动效时退普通毛玻璃
 *        （Rein 版此处由「低画质档」承担，语义等价：省一次全屏合成）；
 *   3. 材质默认值换成独立的一组（见下方 withDefaults），直接写成 prop 默认值 ——
 *      Rein 的 system/glassParams 调参面板 / localStorage 会话不随行；
 *   4. Rein 的设计令牌（--glass-fill / --line / --shadow-float / --surface…）不存在于
 *      宿主仓库，全部改写成 var(--glass-*, 字面量)：开箱即用，宿主仍可整体换肤；
 *      V2 起宿主 tokens.css 按 html[data-theme] 定义 --glass-* 两套取值，玻璃随站点
 *      主题整体换肤（折射分支底色建议调用方传 fill="var(--glass-refract-fill)"，
 *      不传时组件也自动读该令牌，见 rootStyle）。
 *   5. 上游 vue-bits 用 Tailwind 类名，这里保持 scoped CSS（与 Rein 一致）。
 *
 * 退化（不是兜底补丁，是常态路径之一）：
 *   - 不支持 `backdrop-filter: url()` 或要求减弱动效 → 普通毛玻璃（blur + saturate）；
 *   - 连 backdrop-filter 都不支持 → 浏览器丢弃模糊声明，剩下半透明实底 + 内描边
 *     （CSS 天然完成这一步：背景色始终在，模糊只是叠加）；
 *   - 系统要求「减弱透明度」（prefers-reduced-transparency）→ 收成近实底，模糊全关。
 */
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    width?: string | number
    height?: string | number
    /** 圆角：数字按 px，字符串原样用（'50%' = 正圆，'999px' = 胶囊） */
    borderRadius?: number | string
    /** 边缘厚度比例（占短边的一半的比例）：越大「玻璃越厚」，折射带越宽。
     *  位移量是按整块尺寸算的绝对像素（distortionScale），小尺寸表面边缘带收得
     *  太窄时整块会糊成一团彩色 —— 44px 按钮上 0.02 的折射带只有 0.44px 宽，
     *  看观感偏「薄边」；嫌糊可加大 borderWidth 或收小 |distortionScale|。 */
    borderWidth?: number
    /** 位移贴图中心亮度（%）：50 = 中灰 = 中心不位移（只有边缘在折射）——
     *  这是整块看着「是玻璃」而不是「糊成一团」的关键，别乱动这一档 */
    brightness?: number
    /** 位移贴图里那块内缩亮块的不透明度 */
    opacity?: number
    /** 位移贴图的模糊半径（px）：边缘那道斜坡由它撑开 */
    blur?: number
    /** 位移贴图的光栅分辨率除数（1 = 按元素像素尺寸烘，4 = 1/4 分辨率再由
     *  feImage 拉回原尺寸）。只影响成本、几乎不影响观感 —— 贴图是一条平滑渐变，
     *  降分辨率只是把它采样得粗一点 */
    mapScale?: number
    /** feDisplacementMap 的 scale：折射位移强度，按**绝对像素**给 ——
     *  小表面本来就只需 ±20 上下，大面板才需要上百的位移把边缘整个扯开 */
    distortionScale?: number
    /** 收尾 feGaussianBlur 的 stdDeviation：把位移出来的硬边化开（边缘柔化） */
    displace?: number
    /** 折射分支的背景饱和度（拼进 backdrop-filter 的 saturate()） */
    saturation?: number
    /** 玻璃底色浓度（折射分支 hsl 底色的透明度） */
    backgroundOpacity?: number
    xChannel?: 'R' | 'G' | 'B'
    yChannel?: 'R' | 'G' | 'B'
    /** 位移贴图里两道通道渐变的混合方式（上游同名参数，默认 difference） */
    mixBlendMode?: string
    /** 玻璃底色方向：auto 跟随站点主题（html[data-theme]），dark / light 强制 ——
     *  压在彩色照片或墙纸上的玻璃无论什么主题都该压暗，否则白字读不出来 */
    tint?: 'auto' | 'light' | 'dark'
    /** 折射分支的底用什么颜色（CSS 颜色，可带 var()）：缺省按亮暗色取半透明黑 / 白 */
    fill?: string
    /** 额外的内联样式（上游同名 prop）：与内部计算出的尺寸/背景合并，同名时以调用方为准 */
    style?: Record<string, string>
  }>(),
  {
    width: '100%',
    height: '100%',
    borderRadius: 50,
    // 材质默认值（与 GlassSurface prop 同名，独立标定的一组）：
    //   薄边（borderWidth 0.02）+ 大位移（distortionScale -150）+ 柔化 2.0 ——
    //   玻璃读起来是「一层很薄的膜裹着厚折射」；贴图半低成本烘（mapScale 4）；
    //   底色浓度 0.72 压得厚，折射层背后隔着这层底再看页面 —— 适合悬浮按钮
    //   这类「底下内容不可控」的场景，浓度高才压得住。
    borderWidth: 0.02,
    brightness: 50,
    opacity: 0.95,
    blur: 6,
    mapScale: 4,
    distortionScale: -150,
    displace: 2.0,
    saturation: 1.4,
    backgroundOpacity: 0.72,
    xChannel: 'R',
    yChannel: 'G',
    mixBlendMode: 'difference',
    // V2 起站点有双主题：默认 'auto' 跟随 html[data-theme]（见下方 isDarkMode）——
    // 折射底色经 --glass-refract-fill 令牌随站点换肤。压在彩色照片等不可控背景上的
    // 调用方仍可显式传 'dark' / 'light' 强制。
    tint: 'auto',
    style: () => ({}),
  },
)

/** 每个实例独立的 id：同一个页面可以并存多块玻璃，滤镜定义不能串 */
const uid = Math.random().toString(36).slice(2, 12)
const filterId = `glass-filter-${uid}`

const root = ref<HTMLDivElement | null>(null)
const el = ref<SVGSVGElement | null>(null)

/* ---------- 折射开关：运行时能力检测（取代 Rein 的画质档位体系） ---------- */

/**
 * `backdrop-filter: url(#f)` 只有 Chromium 系认（滤镜当背景滤镜用是它独有的一步）；
 * Safari / Firefox 会**静默忽略**整条声明 —— 不排掉的话表现就是「一片没玻璃的空白」。
 * 探测两步走：先按 UA 排掉已知不支持的内核（这类「留着声明不渲染」解析器抓不到），
 * 再用一个临时元素确认解析器真的把 `url()` 留下来了。探测一次后缓存：能力在一台
 * 设备上是常量。
 */
let svgBackdropCache: boolean | null = null

function supportsSvgBackdrop(): boolean {
  if (svgBackdropCache !== null) return svgBackdropCache
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return (svgBackdropCache = false)
  const ua = navigator.userAgent
  if ((/Safari/.test(ua) && !/Chrome/.test(ua)) || /Firefox/.test(ua)) return (svgBackdropCache = false)
  try {
    const probe = document.createElement('div')
    probe.style.setProperty('backdrop-filter', 'url(#glass-probe)')
    svgBackdropCache = probe.style.getPropertyValue('backdrop-filter') !== ''
  } catch {
    svgBackdropCache = false
  }
  return svgBackdropCache
}

/** 系统要求减弱动效 → 折射整条关掉，退普通毛玻璃（折射也是「动」的一种） */
const reducedMotion = ref(false)
const isDarkMode = ref(true)

/**
 * 站点主题（html[data-theme]）的读取：V2 起玻璃跟随**站点自身主题**而非 OS 的
 * prefers-color-scheme（DESIGN-V2 §3.4.3）——站点主题与系统偏好是两回事，
 * 手动切亮色后玻璃必须跟变。index.html 的内联脚本在任何样式生效前就写好了
 * data-theme，所以这里的初值总是对的；后续变化由 onMounted 的 MutationObserver 跟踪。
 */
function readSiteThemeDark(): boolean {
  if (typeof document === 'undefined') return true
  return document.documentElement.dataset.theme !== 'light'
}

// 客户端首帧就要判定对（否则先糊一帧再跳变成折射）；SSR 上没有 document，
// 先当暗色，由 onMounted 里的观察在挂载后补齐
if (typeof window !== 'undefined') {
  reducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  isDarkMode.value = readSiteThemeDark()
}

/**
 * 折射能不能画：内核认 `backdrop-filter: url()` 且系统没有要求减弱动效。
 * 不满足时这里就老老实实当一块普通毛玻璃 —— 退化路径是常态路径之一。
 */
const canRefract = computed(() => supportsSvgBackdrop() && !reducedMotion.value)

/** 玻璃压暗还是提亮：auto 跟主题，dark / light 由调用方指定 */
const darkTint = computed(() => (props.tint === 'auto' ? isDarkMode.value : props.tint === 'dark'))

function length(value: string | number): string {
  return typeof value === 'number' ? `${value}px` : value
}

/** 表面内联样式：折射分支把底色与 `url(#id)` 拼进 backdrop-filter（连同 -webkit-）；
 *  退化分支只给尺寸/圆角，外观交给下面的 scoped CSS（毛玻璃 / 半透明实底）。 */
const rootStyle = computed<Record<string, string>>(() => {
  const base: Record<string, string> = {
    width: length(props.width),
    height: length(props.height),
    borderRadius: length(props.borderRadius),
  }
  if (!canRefract.value) return base
  // fill 缺省时读统一令牌 --glass-refract-fill（宿主 tokens.css 按主题给值，
  // 玻璃随站点换肤）；令牌缺失时按 tint 方向落回原字面量（自包含契约不变）。
  const fallbackFill = darkTint.value
    ? `hsl(0 0% 0% / ${props.backgroundOpacity})`
    : `hsl(0 0% 100% / ${props.backgroundOpacity})`
  const fill = props.fill || `var(--glass-refract-fill, ${fallbackFill})`
  return {
    ...base,
    background: fill,
    backdropFilter: `url(#${filterId}) saturate(${props.saturation})`,
    WebkitBackdropFilter: `url(#${filterId}) saturate(${props.saturation})`,
  }
})

/* ---------- 滤镜机械（原 GlassFilter.vue，参数直读 props） ---------- */

/**
 * 位移贴图的模块级缓存：指纹 → data URI。
 *
 * 贴图本身已经按「尺寸 + 参数」去重（不掺实例 id，所以同规格的玻璃拿到同一个
 * 字符串，浏览器按 URL 缓存解码结果），但**拼这个字符串**的工作仍是每块玻璃各做一遍：
 * 往模板里插十来个值，再对几千个字符跑一次 encodeURIComponent。一屏十来块玻璃
 * 就是十来次。不设上限：一个会话里纹理规格的组合数就是「出现过的玻璃尺寸 × 参数组」，
 * 拖动窗口这类连续变化由「超 64 条整份清掉」兜住。
 */
const MAP_CACHE = new Map<string, string>()

/** 参与烘图的参数拼成指纹（mapDataUri 的缓存键；重烘判定见 updateMap） */
function mapKeyOf(w: number, h: number, rx: number): string {
  return [
    w,
    h,
    rx,
    props.mixBlendMode,
    props.borderWidth,
    props.brightness,
    props.opacity,
    props.blur,
    props.mapScale,
  ].join('|')
}

let resizeObserver: ResizeObserver | null = null
let rafId = 0
/** 上一次烘贴图用的指纹，以及当时那张贴图挂在哪个元素上（守卫重烘） */
let mapEl: Element | null = null
let mapKey = ''

/** 写入前先比旧值：SVG 属性写入不比较新旧，写一次就是一次滤镜失效 —— 「没变就不写」 */
function writeAttr(node: Element, name: string, value: string): void {
  if (node.getAttribute(name) !== value) node.setAttribute(name, value)
}

/**
 * 贴图里的圆角必须是长度：优先取**计算值** —— 调用方给 '50%' / '999px' / calc()
 * 这些「组件解析不了」的形式，浏览器都已经算成像素了；取不到再按 prop 的写法解析。
 * 两种来路最后都夹到短边的一半（胶囊 / 正圆都落在这里）。
 * 只在指纹变了的时候才调用：getComputedStyle 是一次强制样式结算。
 */
function radiusPx(w: number, h: number): number {
  const max = Math.min(w, h) / 2
  const node = root.value
  const computed = node ? getComputedStyle(node).borderRadius : ''
  const raw =
    computed.trim().split(/\s+/)[0] ||
    (typeof props.borderRadius === 'number' ? `${props.borderRadius}px` : String(props.borderRadius))
  const px = raw.endsWith('%') ? (max * 2 * parseFloat(raw)) / 100 : parseFloat(raw) || 0
  return Math.max(0, Math.min(px, max))
}

/**
 * 位移贴图。viewBox 始终是元素的实际像素尺寸，只有**光栅分辨率**受 mapScale 影响：
 * 根 svg 的 width/height 给成 w/scale，feImage 再用 preserveAspectRatio="none" 拉回原尺寸。
 * 贴图是一条平滑渐变（边缘那道斜坡由 blur 撑开），降分辨率只是把斜坡采样得粗一点，
 * 位移量是连续量，采样误差落回亚像素 —— 「省一点、观感几乎不动」的那个旋钮。
 */
function mapDataUri(w: number, h: number, rx: number): string {
  const key = mapKeyOf(w, h, rx)
  const hit = MAP_CACHE.get(key)
  if (hit !== undefined) return hit

  const edge = Math.min(w, h) * (props.borderWidth * 0.5)
  const scale = Math.max(1, Math.round(props.mapScale))
  // id 是写死的：贴图是自己一份独立文档，不会与页面里的 id 串。写死之后
  // 「尺寸 + 参数」相同的玻璃拿到的是**同一个字符串**，浏览器按 URL 缓存解码结果。
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
        <rect x="${edge}" y="${edge}" width="${w - edge * 2}" height="${h - edge * 2}" rx="${rx}" fill="hsl(0 0% ${props.brightness}% / ${props.opacity})" style="filter:blur(${props.blur}px)" />
      </svg>
    `
  const uri = `data:image/svg+xml,${encodeURIComponent(svg)}`
  // 拖窗口时尺寸会连续变，每次都是一个新键 —— 超上限就整份清掉，别让缓存长成几百条。
  if (MAP_CACHE.size > 64) MAP_CACHE.clear()
  MAP_CACHE.set(key, uri)
  return uri
}

function updateMap(): void {
  // 不折射时整块定义既不画也不烘：贴图是按尺寸烘一次的解码 + 光栅化，没人引用它
  if (!canRefract.value) return
  // 只在滤镜定义里找：宿主元素里可能有别的图标 SVG
  const img = el.value?.querySelector('feImage')
  if (!img) return
  const node = root.value
  const rect = node?.getBoundingClientRect()
  // 元素还没布局（宽高为 0）时别生成贴图：0 宽的 viewBox 会让位移量算出 NaN
  const w = Math.max(1, Math.round(rect?.width ?? 0))
  const h = Math.max(1, Math.round(rect?.height ?? 0))
  // 指纹里放的是 prop 上的圆角写法而不是解析后的像素：解析要 getComputedStyle，
  // 那是一次强制样式结算，只在真的要重烘时才付（radiusPx 在下面才调用）。
  const key = [
    w,
    h,
    props.borderRadius,
    props.mixBlendMode,
    props.borderWidth,
    props.brightness,
    props.opacity,
    props.blur,
    props.mapScale,
  ].join('|')
  // 尺寸与参数都没动、贴图也还挂在同一个元素上，就别重烘：
  // ResizeObserver 每帧都回调，拖窗口时按帧重烘是白花
  if (img === mapEl && key === mapKey) return
  mapEl = img
  mapKey = key
  const rx = radiusPx(w, h)
  writeAttr(img, 'href', mapDataUri(w, h, rx))
}

function updateFilter(): void {
  if (!canRefract.value) return
  const rootEl = el.value
  if (!rootEl) return
  // 只有一次位移：位移量就是 distortionScale
  const dm = rootEl.querySelector('feDisplacementMap')
  if (dm) {
    // 通道选择器是常量（prop），守卫写入让它在第一次之后就完全免费
    writeAttr(dm, 'xChannelSelector', props.xChannel)
    writeAttr(dm, 'yChannelSelector', props.yChannel)
    writeAttr(dm, 'scale', String(props.distortionScale))
  }
  const blur = rootEl.querySelector('feGaussianBlur')
  if (blur) writeAttr(blur, 'stdDeviation', String(props.displace))
}

/** 贴图重烘与滤镜重写合并到一帧一次：拖窗口时 ResizeObserver 每帧都回调 ——
 *  不合并就按事件数重烘。 */
function schedule(): void {
  if (rafId) return
  rafId = requestAnimationFrame(() => {
    rafId = 0
    updateMap()
    updateFilter()
  })
}

function observeHost(): void {
  resizeObserver?.disconnect()
  resizeObserver = null
  if (!canRefract.value) return
  const node = root.value
  if (!node || typeof ResizeObserver === 'undefined') return
  // 尺寸一变就要重画贴图：贴图是按当时的像素尺寸烘出来的。
  // 回调只排一次队（schedule 会合并），真正的重烘在下一帧。
  resizeObserver = new ResizeObserver(() => schedule())
  resizeObserver.observe(node)
}

watch(
  () => [
    canRefract.value,
    props.width,
    props.height,
    props.borderRadius,
    props.mixBlendMode,
    props.borderWidth,
    props.brightness,
    props.opacity,
    props.blur,
    props.mapScale,
    props.distortionScale,
    props.displace,
  ],
  () => {
    observeHost()
    schedule()
  },
  { flush: 'post' },
)

let disposeMedia: (() => void) | null = null

onMounted(() => {
  // 站点主题切换（useTheme / 内联脚本写 html[data-theme]）→ 玻璃跟随：
  // 观察根元素的 data-theme 属性变化（代替 v2.0 的 prefers-color-scheme 媒体查询）
  const themeObserver = new MutationObserver(() => {
    isDarkMode.value = readSiteThemeDark()
  })
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  })

  const motionMq = window.matchMedia('(prefers-reduced-motion: reduce)')
  const onMotion = (e: MediaQueryListEvent): void => {
    reducedMotion.value = e.matches
  }
  motionMq.addEventListener('change', onMotion)

  disposeMedia = (): void => {
    themeObserver.disconnect()
    motionMq.removeEventListener('change', onMotion)
  }

  void nextTick(() => {
    observeHost()
    updateMap()
    updateFilter()
  })
})

onUnmounted(() => {
  disposeMedia?.()
  resizeObserver?.disconnect()
  if (rafId) cancelAnimationFrame(rafId)
})
</script>

<template>
  <!-- style 同上游同名 prop：与内部算出的尺寸 / 背景**合并**，同名以调用方为准。
       它是「定位 / 层叠 / 命中区」这类几何的出口 —— 组件自己只管材质。 -->
  <div ref="root" class="glass" :class="{ 'glass--dark': darkTint }" :style="[rootStyle, props.style]">
    <!-- 滤镜定义（不参与绘制，opacity 0）：位移贴图 + 位移链的唯一实现就在这里
         （Rein 版在 GlassFilter.vue，移植时并入）。真正生效的是上面内联
         `backdrop-filter: url(#filterId)` 对它的引用。 -->
    <svg v-show="canRefract" ref="el" class="gdefs" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <!-- 唯一的一条链：贴图 → 一次位移 → 收尾柔化，3 个原语。
             feImage 是位移贴图（按元素像素尺寸烘的 data URI，见 mapDataUri），
             feDisplacementMap 拿它把**背景**按红/绿通道的差位移开，
             feGaussianBlur 把位移出来的硬边化开（stdDeviation 走 displace「边缘柔化」）。 -->
        <filter :id="filterId" color-interpolation-filters="sRGB" x="0%" y="0%" width="100%" height="100%">
          <feImage x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="map" />
          <feDisplacementMap in="SourceGraphic" in2="map" result="output" />
          <feGaussianBlur in="output" stdDeviation="0.7" />
        </filter>
      </defs>
    </svg>

    <div class="gbody">
      <slot />
    </div>
  </div>
</template>

<style scoped>
/* 表面本体：折射或退化都发生在这个盒子上，圆角与尺寸由调用方给。
   Rein 的设计令牌全部折成 var(--glass-*, 字面量)：宿主不定义就是这组默认，定义了就整体换肤。
   宿主（本站）在 tokens.css 里定死的是 Rein「超高材质 · 暗色」那组光学值 ——
   本站没有 data-perf 档位体系且恒为深色，超高档就是唯一档。 */
.glass {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  /* 宿主仓库没有全局 reset（上游由 Tailwind preflight / Rein 的 base.css 提供），显式声明 */
  box-sizing: border-box;
  /* 退化分支的外观（普通毛玻璃）：不认 backdrop-filter 的内核会丢弃模糊声明，
     剩下半透明实底 + 内描边 —— 正好落在第三档退化上。本站恒为深色，fallback
     直接给海军蓝黑（token 值见 tokens.css --glass-fallback-fill）。 */
  background: var(--glass-fallback-fill, rgb(8 14 28 / 0.74));
  border: 1px solid var(--glass-border, rgb(160 190 240 / 0.2));
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  /* 影子 = Rein `.glass` 的整条光学栈（值取超高 · 暗色组）：
     落影 → 外缘层 halo（暗色下是溢光不是落影）→ 上缘受光亮线 rim-hi →
     下缘背光暗线 rim-lo → 内顶高光 sheen 往下化开 → 内圈细描边 rim-2
     （厚玻璃的第二道截面亮线）→ 上缘内晕 caustic（光穿过玻璃洒在内容上的焦散）。
     折射分支沿用同一份影子（内联样式只换 background / backdrop-filter）——
     少了这条光学层，哪怕折射算得再对，看着也只是一块平色。 */
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

/* 系统要求「减弱透明度」时收成近实底 —— 折射与毛玻璃都关掉，光学内层随之收掉。
   带 !important：折射那一支的 `backdrop-filter` 是**内联样式**（见 rootStyle），
   媒体查询里的普通声明压不过它（不关的话表现为「什么都不糊」）。 */
@media (prefers-reduced-transparency: reduce) {
  .glass {
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
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 滤镜定义本身不参与绘制：opacity 0 + 绝对定位；真正生效的是别处
   `backdrop-filter: url(#id)` 对它的引用。 */
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
