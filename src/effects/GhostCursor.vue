<script setup lang="ts">
/**
 * WebGL 拖尾烟雾光标 —— three 正交相机 + 全屏 Plane + fbm 噪声，
 * 当前鼠标位与 trailLength 长度的环形缓冲历史位逐点画成烟雾 blob，
 * 后处理链 RenderPass → UnrealBloomPass → FilmGrain → Unpremultiply。
 * 移植自 vue-bits GhostCursor（MIT），本地副本 research/vue-bits/GhostCursor.vue，
 * props 按 docs/CONTRACTS.md §3.2 全量保留，无裁剪。
 *
 * 降级与降载（除注明外均为上游原生机制，见 research 笔记 GhostCursor 节）：
 *  - pixel budget：targetPixels 未传时触屏 0.9e6 / 桌面 1.3e6，超出预算按
 *    sqrt(budget/need) 压 pixelRatio（下限 0.5）；maxDevicePixelRatio 默认 0.5 硬顶 DPR；
 *  - 指针静止 fadeDelay 后按 fadeDuration 淡出并自动停 rAF，再次移动唤醒；
 *  - prefers-reduced-motion: reduce → 不渲染、不注册监听（本仓新增，§3.8），
 *    并监听 media query 变化实时启停；
 *  - WebGL 上下文创建失败（低端设备/无 GPU/被禁用）→ 静默降级为空层，不抛错（本仓新增）；
 *  - 事件挂父元素（parentElement），挂载时把 static 父元素改为 relative，卸载还原（上游原样）。
 *
 * 待机漂移（本仓新增，非上游行为）：
 *  - 指针静止 idleDelayMs（默认桌面 2200 / 触屏 1500）后，光斑脱离光标，锚定脱离点、
 *    沿不可通约频率正弦叠加出的准周期路径自主漂移（起步无跳变，中断后路径时钟可续）；
 *    指针再动则 0.35s 内滑翔回光标。脱离用时 1.6s——环境态慢、用户等待的回归快。
 *  - 漂移期间 iIdle→1：烟雾自身流动提速（0.10→0.22）并叠加 ~5s 周期的呼吸起伏；
 *    待机不再淡出（上游的静止淡出仅在 idleDrift=false 时保留），页面加载后不动鼠标
 *    也能看到特效。指针不在页面内时漂移按 ~30fps 渲染省电。
 *  - idleDrift 默认桌面开 / 触屏关；两个新 prop 均为动态读取，不触发 WebGL 重建。
 *
 * 色值增强（本仓新增）：上游 alpha = pow(smoke, 2.5) 平均仅 ~0.16，且 tint 向白混
 * 15%/25%，色值在深色页面上读不出来 —— 现改为对比度重映射（smoothstep 0.10→0.90）
 * + pow 1.8 × 1.45 增益（平均 alpha ~0.4），tint 白混降为 8%/15%；App.vue 侧再叠加
 * brightness / bloom / DPR 用法参数（见 §3.2 契约外用法）。
 *
 * 常驻像素噪点（本仓新增）：与烟雾同画布同像素网格的绿色像素方块"尘"——grid-hash 撒点
 * + 半周期慢速明灭（周期 2.5~6s/点）。方块 2 渲染像素（≈3 CSS px，颗粒 grain 为 1 渲染
 * 像素，同网格）、候选格占比 3.5%（全屏同时可见约 30~40 颗）、峰值 alpha ≤0.45，密度与
 * 频率均以不干扰阅读为准。无论指针静与不静常驻渲染，且不随烟雾淡出（独立于 iOpacity）。
 * 配色：暗色=信号绿 #00ff55（网口 LED 那种），亮色=低饱和亮绿 #6fdc9c；本站恒深色，
 * 仅系统显式 prefers-color-scheme: light 时走亮绿分支，变化实时生效。
 * pixelNoise=false 可整体关闭；开启时 rAF 循环不退出（无漂移也常驻），指针不在页面内
 * 统一按 ~30fps 渲染。
 *
 * 模板改动：上游唯一一行 Tailwind（pointer-events-none absolute inset-0）改写为 scoped CSS。
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import {
  computed,
  markRaw,
  onBeforeUnmount,
  onMounted,
  ref,
  useTemplateRef,
  watch,
  type CSSProperties
} from 'vue';

type GhostCursorProps = {
  className?: string;
  style?: CSSProperties;

  trailLength?: number;
  inertia?: number;
  grainIntensity?: number;
  bloomStrength?: number;
  bloomRadius?: number;
  bloomThreshold?: number;

  brightness?: number;
  color?: string;
  mixBlendMode?: CSSProperties['mixBlendMode'];
  edgeIntensity?: number;

  maxDevicePixelRatio?: number;
  targetPixels?: number;
  fadeDelayMs?: number;
  fadeDurationMs?: number;

  /** 待机自主漂移（本仓新增）：未传时桌面 true / 触屏 false */
  idleDrift?: boolean;
  /** 进入漂移的静止阈值 ms（本仓新增）：未传时桌面 2200 / 触屏 1500 */
  idleDelayMs?: number;
  /** 常驻绿色像素噪点（本仓新增）：默认 true */
  pixelNoise?: boolean;
  zIndex?: number;
};

const props = withDefaults(defineProps<GhostCursorProps>(), {
  trailLength: 50,
  inertia: 0.5,
  grainIntensity: 0.05,
  bloomStrength: 0.1,
  bloomRadius: 1.0,
  bloomThreshold: 0.025,
  brightness: 1,
  color: '#A0FFBC',
  mixBlendMode: 'screen',
  edgeIntensity: 0,
  maxDevicePixelRatio: 0.5,
  zIndex: 10
});

const containerRef = useTemplateRef('containerRef');
const rendererRef = ref<THREE.WebGLRenderer | null>(null);
const composerRef = ref<EffectComposer | null>(null);
const materialRef = ref<THREE.ShaderMaterial | null>(null);
const bloomPassRef = ref<UnrealBloomPass | null>(null);
const filmPassRef = ref<ShaderPass | null>(null);

const trailBufRef = ref<THREE.Vector2[]>([]);
const headRef = ref(0);

const rafRef = ref<number | null>(null);
const resizeObsRef = ref<ResizeObserver | null>(null);
const currentMouseRef = ref(new THREE.Vector2(0.5, 0.5));
const velocityRef = ref(new THREE.Vector2(0, 0));
const fadeOpacityRef = ref(1);
const lastMoveTimeRef = ref(typeof performance !== 'undefined' ? performance.now() : Date.now());
const pointerActiveRef = ref(false);
const runningRef = ref(false);

/* ---- 待机漂移状态（本仓新增；setup() 时复位）---- */
const wanderKRef = ref(0); // 0=贴住光标 1=完全自主漂移
const wanderTRef = ref(0); // 漂移路径时钟，仅漂移期间累计（中断后从同一位相续走）
const wanderingRef = ref(false); // 上一帧是否漂移中（上升沿采样锚点）
const wanderAnchorRef = ref(new THREE.Vector2(0.5, 0.5)); // 脱离时光斑位置（路径锚点）
const wanderP0Ref = ref(new THREE.Vector2()); // 脱离时刻的路径采样值 P(t0)
const wanderPosRef = ref(new THREE.Vector2()); // 当前漂移目标位
const wanderOffRef = ref(new THREE.Vector2()); // 每帧路径偏移 scratch
const lastFrameTsRef = ref(0);
const lastRenderTsRef = ref(0);

/** 系统要求减弱动效 → 整个特效不启用（光标类降级：不渲染、不监听，§3.8） */
const reducedMotion = ref(
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
);

const isTouch = computed(
  () => typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)
);

const pixelBudget = computed(() => props.targetPixels ?? (isTouch.value ? 0.9e6 : 1.3e6));
const fadeDelay = computed(() => props.fadeDelayMs ?? (isTouch.value ? 500 : 1000));
const fadeDuration = computed(() => props.fadeDurationMs ?? (isTouch.value ? 1000 : 1500));

/* 触屏无 hover 光标，漂移无从"回归"，默认关 */
const driftEnabled = computed(() => props.idleDrift ?? !isTouch.value);
const idleDelay = computed(() => props.idleDelayMs ?? (isTouch.value ? 1500 : 2200));
const pixelNoiseOn = computed(() => props.pixelNoise ?? true);

/* 像素噪点双色（本仓新增）：暗色=信号绿（网口 LED 那种），亮色=低饱和亮绿 */
const NOISE_COLOR_DARK = new THREE.Color('#00ff55');
const NOISE_COLOR_LIGHT = new THREE.Color('#6fdc9c');
const lightScheme = ref(
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: light)').matches
    : false
);

const baseVertexShader = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform float iTime;
uniform vec3  iResolution;
uniform vec2  iMouse;
uniform vec2  iPrevMouse[MAX_TRAIL_LENGTH];
uniform float iOpacity;
uniform float iScale;
uniform vec3  iBaseColor;
uniform float iBrightness;
uniform float iEdgeIntensity;
uniform float iIdle;
uniform vec3  iNoiseColor;
uniform float iNoiseAmp;
varying vec2  vUv;

float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7))) * 43758.5453123); }
float noise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    f *= f * (3. - 2. * f);
    return mix(mix(hash(i + vec2(0.,0.)), hash(i + vec2(1.,0.)), f.x),
                mix(hash(i + vec2(0.,1.)), hash(i + vec2(1.,1.)), f.x), f.y);
}
float fbm(vec2 p){
    float v = 0.0;
    float a = 0.5;
    mat2 m = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for(int i=0;i<5;i++){
        v += a * noise(p);
        p = m * p * 2.0;
        a *= 0.5;
    }
    return v;
}
vec3 tint1(vec3 base){ return mix(base, vec3(1.0), 0.08); }          // upstream 0.15: less bleach
vec3 tint2(vec3 base){ return mix(base, vec3(0.8, 0.9, 1.0), 0.15); } // upstream 0.25

vec4 blob(vec2 p, vec2 mousePos, float intensity, float activity) {
    // iIdle (idle-drift weight) -> 1: faster smoke flow + breathing (site-local addition)
    float flow  = mix(0.10, 0.22, iIdle);
    float swirl = mix(0.15, 0.30, iIdle);
    vec2 q = vec2(fbm(p * iScale + iTime * flow), fbm(p * iScale + vec2(5.2,1.3) + iTime * flow));
    vec2 r = vec2(fbm(p * iScale + q * 1.5 + iTime * swirl), fbm(p * iScale + q * 1.5 + vec2(8.3,2.8) + iTime * swirl));

    float smoke = fbm(p * iScale + r * 0.8);
    // breath period ~5s (2*pi/1.26); glow lags radius by 1.7 rad: expand first, brighten after
    float breath = 1.0 + iIdle * 0.13 * sin(iTime * 1.26);
    float radius = (0.5 + 0.3 * (1.0 / iScale)) * breath;
    float distFactor = 1.0 - smoothstep(0.0, radius * activity, length(p - mousePos));
    // site-local: contrast remap + gentler pow + gain -> avg alpha ~0.4 (upstream pow(smoke,2.5) ~0.16)
    smoke = smoothstep(0.10, 0.90, smoke);
    float alpha = pow(smoke, 1.8) * 1.45 * distFactor;
    float glow = intensity * (1.0 + iIdle * 0.10 * sin(iTime * 1.26 + 1.7));

    vec3 c1 = tint1(iBaseColor);
    vec3 c2 = tint2(iBaseColor);
    vec3 color = mix(c1, c2, sin(iTime * 0.5) * 0.5 + 0.5);

    return vec4(color * alpha * glow, alpha * glow);
}

void main() {
    vec2 uv = (gl_FragCoord.xy / iResolution.xy * 2.0 - 1.0) * vec2(iResolution.x / iResolution.y, 1.0);
    vec2 mouse = (iMouse * 2.0 - 1.0) * vec2(iResolution.x / iResolution.y, 1.0);

    vec3 colorAcc = vec3(0.0);
    float alphaAcc = 0.0;

    vec4 b = blob(uv, mouse, 1.0, iOpacity);
    colorAcc += b.rgb;
    alphaAcc += b.a;

    for (int i = 0; i < MAX_TRAIL_LENGTH; i++) {
        vec2 pm = (iPrevMouse[i] * 2.0 - 1.0) * vec2(iResolution.x / iResolution.y, 1.0);
        float t = 1.0 - float(i) / float(MAX_TRAIL_LENGTH);
        t = pow(t, 2.0);
        if (t > 0.01) {
            vec4 bt = blob(uv, pm, t * 0.8, iOpacity);
            colorAcc += bt.rgb;
            alphaAcc += bt.a;
        }
    }

    colorAcc *= iBrightness;

    vec2 uv01 = gl_FragCoord.xy / iResolution.xy;
    float edgeDist = min(min(uv01.x, 1.0 - uv01.x), min(uv01.y, 1.0 - uv01.y));
    float distFromEdge = clamp(edgeDist * 2.0, 0.0, 1.0);
    float k = clamp(iEdgeIntensity, 0.0, 1.0);
    float edgeMask = mix(1.0 - k, 1.0, distFromEdge);

    vec3 outColor = colorAcc;
    float outAlpha = clamp(alphaAcc * iOpacity * edgeMask, 0.0, 1.0);

    // site-local: persistent green pixel-dust on the same canvas & pixel grid as the smoke
    const float ND_CELL = 16.0; // candidate grid cell, render px
    const float ND_SQ = 2.0;    // square size, render px (film grain is 1px, same grid)
    const float ND_P = 0.035;   // fraction of cells that ever light up
    vec2 ndGrid = floor(gl_FragCoord.xy / ND_CELL);
    float n1 = hash(ndGrid + 4.7);
    float n2 = hash(ndGrid * 1.7 + 9.1);
    float n3 = hash(ndGrid * 2.3 + 1.3);
    if (iNoiseAmp > 0.0 && n1 < ND_P) {
        float period = mix(2.5, 6.0, n2); // per-dot twinkle period, seconds
        float ph = fract(iTime / period + n3 * 7.0);
        float tw = max(0.0, sin(ph * 6.2831853));
        tw *= tw; // half-cycle gentle fade in/out, half off
        vec2 local = gl_FragCoord.xy - ndGrid * ND_CELL;
        float inSq = step(local.x, ND_SQ) * step(local.y, ND_SQ);
        float na = tw * inSq * mix(0.22, 0.45, n3) * iNoiseAmp;
        outColor += iNoiseColor * (0.7 + 0.6 * n2) * na;
        outAlpha = clamp(outAlpha + na, 0.0, 1.0);
    }

    gl_FragColor = vec4(outColor, outAlpha);
}
`;

function calculateScale(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  const base = 600;
  const current = Math.min(Math.max(1, r.width), Math.max(1, r.height));
  return Math.max(0.5, Math.min(2.0, current / base));
}

/**
 * 漂移路径（本仓新增）：两组不可通约频率的正弦叠加，准周期、视觉上永不重复。
 * 返回相对锚点的偏移量写入 out；最高频 0.73rad/s、最大偏移 ~0.29×宽 / ~0.23×高，
 * 足够慢，50 帧拖尾画出来是一条流动的雾带而不是抖动。
 */
function wanderOffset(t: number, out: THREE.Vector2): THREE.Vector2 {
  return out.set(
    0.2 * Math.sin(t * 0.31 + 1.7) + 0.085 * Math.sin(t * 0.73 + 0.4),
    0.16 * Math.cos(t * 0.26 + 2.3) + 0.065 * Math.sin(t * 0.57 + 0.9)
  );
}

let cleanup: (() => void) | null = null;
const setup = () => {
  if (reducedMotion.value) return;

  const host = containerRef.value;
  const parent = host?.parentElement;
  if (!host || !parent) return;

  const prevParentPos = parent.style.position;
  if (!prevParentPos || prevParentPos === 'static') {
    parent.style.position = 'relative';
  }

  // WebGL 上下文创建是整条链里唯一会抛错的构建步骤：失败（无 GPU/被禁用）就
  // 还原父元素并静默降级为空层，不上抛拖垮页面。
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = markRaw(
      new THREE.WebGLRenderer({
        antialias: !isTouch.value,
        alpha: true,
        depth: false,
        stencil: false,
        powerPreference: isTouch.value ? 'low-power' : 'high-performance',
        premultipliedAlpha: false,
        preserveDrawingBuffer: false
      })
    );
  } catch {
    if (!prevParentPos || prevParentPos === 'static') {
      parent.style.position = prevParentPos;
    }
    return;
  }
  rendererRef.value = renderer;

  renderer.domElement.style.pointerEvents = 'none';
  if (props.mixBlendMode) {
    renderer.domElement.style.mixBlendMode = String(props.mixBlendMode);
  } else {
    renderer.domElement.style.removeProperty('mix-blend-mode');
  }

  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.background = 'transparent';

  host.appendChild(renderer.domElement);

  const scene = markRaw(new THREE.Scene());
  const camera = markRaw(new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1));

  const geom = markRaw(new THREE.PlaneGeometry(2, 2));

  const maxTrail = Math.max(1, Math.floor(props.trailLength));
  trailBufRef.value = Array.from({ length: maxTrail }, () => new THREE.Vector2(0.5, 0.5));
  headRef.value = 0;
  wanderKRef.value = 0;
  wanderTRef.value = 0;
  wanderingRef.value = false;
  lastFrameTsRef.value = 0;
  lastRenderTsRef.value = 0;

  const baseColor = new THREE.Color(props.color);
  const noiseColor = lightScheme.value ? NOISE_COLOR_LIGHT : NOISE_COLOR_DARK;

  const material = markRaw(
    new THREE.ShaderMaterial({
      defines: { MAX_TRAIL_LENGTH: maxTrail },
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector3(1, 1, 1) },
        iMouse: { value: new THREE.Vector2(0.5, 0.5) },
        iPrevMouse: { value: trailBufRef.value.map(v => v.clone()) },
        iOpacity: { value: 1.0 },
        iScale: { value: 1.0 },
        iIdle: { value: 0 },
        iBaseColor: { value: new THREE.Vector3(baseColor.r, baseColor.g, baseColor.b) },
        iNoiseColor: { value: new THREE.Vector3(noiseColor.r, noiseColor.g, noiseColor.b) },
        iNoiseAmp: { value: pixelNoiseOn.value ? 1 : 0 },
        iBrightness: { value: props.brightness },
        iEdgeIntensity: { value: props.edgeIntensity }
      },
      vertexShader: baseVertexShader,
      fragmentShader,
      transparent: true,
      depthTest: false,
      depthWrite: false
    })
  );
  materialRef.value = material;

  const mesh = new THREE.Mesh(geom, material);
  scene.add(mesh);

  const composer = markRaw(new EffectComposer(renderer));
  composerRef.value = composer;

  const renderPass = markRaw(new RenderPass(scene, camera));
  composer.addPass(renderPass);

  const bloomPass = markRaw(
    new UnrealBloomPass(new THREE.Vector2(1, 1), props.bloomStrength, props.bloomRadius, props.bloomThreshold)
  );
  bloomPassRef.value = bloomPass;
  composer.addPass(bloomPass);

  const filmPass = markRaw(
    new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        iTime: { value: 0 },
        intensity: { value: props.grainIntensity }
      },
      vertexShader: `
    varying vec2 vUv;
    void main(){
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
    `,
      fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float iTime;
    uniform float intensity;
    varying vec2 vUv;

    float hash1(float n){ return fract(sin(n)*43758.5453); }

    void main(){
        vec4 color = texture2D(tDiffuse, vUv);
        float n = hash1(vUv.x*1000.0 + vUv.y*2000.0 + iTime) * 2.0 - 1.0;
        color.rgb += n * intensity * color.rgb;
        gl_FragColor = color;
    }
    `
    })
  );
  filmPassRef.value = filmPass;
  composer.addPass(filmPass);

  composer.addPass(
    new ShaderPass({
      uniforms: { tDiffuse: { value: null } },
      vertexShader: `
          varying vec2 vUv;
          void main(){
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
      fragmentShader: `
          uniform sampler2D tDiffuse;
          varying vec2 vUv;
          void main(){
            vec4 c = texture2D(tDiffuse, vUv);
            float a = max(c.a, 1e-5);
            vec3 straight = c.rgb / a;
            gl_FragColor = vec4(clamp(straight, 0.0, 1.0), c.a);
          }
        `
    })
  );

  const resize = () => {
    const rect = host.getBoundingClientRect();
    const cssW = Math.max(1, Math.floor(rect.width));
    const cssH = Math.max(1, Math.floor(rect.height));

    const currentDPR = Math.min(
      typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
      props.maxDevicePixelRatio
    );
    const need = cssW * cssH * currentDPR * currentDPR;
    const scale =
      need <= pixelBudget.value ? 1 : Math.max(0.5, Math.min(1, Math.sqrt(pixelBudget.value / Math.max(1, need))));
    const pixelRatio = currentDPR * scale;

    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(cssW, cssH, false);

    composer.setPixelRatio?.(pixelRatio);
    composer.setSize(cssW, cssH);

    const wpx = Math.max(1, Math.floor(cssW * pixelRatio));
    const hpx = Math.max(1, Math.floor(cssH * pixelRatio));
    material.uniforms.iResolution.value.set(wpx, hpx, 1);
    material.uniforms.iScale.value = calculateScale(host);
    bloomPass.setSize(wpx, hpx);
  };

  resize();
  const ro = new ResizeObserver(resize);
  resizeObsRef.value = ro;
  ro.observe(parent);
  ro.observe(host);

  const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const animate = () => {
    const now = performance.now();
    const t = (now - start) / 1000;
    // 时间步进按真实 dt（夹上限 50ms，防后台恢复时跳变）；上游按帧算，漂移逻辑需要它
    const dt = Math.min(0.05, lastFrameTsRef.value ? (now - lastFrameTsRef.value) / 1000 : 1 / 60);
    lastFrameTsRef.value = now;

    const mat = materialRef.value!;
    const comp = composerRef.value!;
    const mouseU = mat.uniforms.iMouse.value as THREE.Vector2;

    /* ---- 待机漂移状态机（本仓新增；driftEnabled=false 时 K 恒为 0，行为同上游）---- */
    const idleMs = now - lastMoveTimeRef.value;
    const wantWander = driftEnabled.value && idleMs > idleDelay.value;
    if (wantWander && !wanderingRef.value) {
      // 脱离上升沿：锚定当前光斑位、路径偏移从 0 起步 → 起步无跳变
      wanderAnchorRef.value.copy(mouseU);
      wanderOffset(wanderTRef.value, wanderP0Ref.value);
    }
    wanderingRef.value = wantWander;
    if (wantWander) {
      wanderTRef.value += dt;
      wanderOffset(wanderTRef.value, wanderOffRef.value);
      wanderPosRef.value.set(
        THREE.MathUtils.clamp(wanderAnchorRef.value.x + wanderOffRef.value.x - wanderP0Ref.value.x, 0.05, 0.95),
        THREE.MathUtils.clamp(wanderAnchorRef.value.y + wanderOffRef.value.y - wanderP0Ref.value.y, 0.05, 0.95)
      );
    }
    // 脱离慢（1.6s，环境态无人等）；回归快（0.35s，用户在等它回来）
    wanderKRef.value = wantWander
      ? Math.min(1, wanderKRef.value + dt / 1.6)
      : Math.max(0, wanderKRef.value - dt / 0.35);
    const kEase = wanderKRef.value * wanderKRef.value * (3 - 2 * wanderKRef.value);

    if (pointerActiveRef.value) {
      velocityRef.value.set(currentMouseRef.value.x - mouseU.x, currentMouseRef.value.y - mouseU.y);
      if (kEase > 0) {
        // 回归途中：光斑从漂移位平滑滑向真实光标
        mouseU.lerpVectors(currentMouseRef.value, wanderPosRef.value, kEase);
      } else {
        mouseU.copy(currentMouseRef.value);
      }
      fadeOpacityRef.value = 1.0;
    } else if (kEase > 0) {
      // 漂移启动/进行中：已淡出的光斑 0.8s 缓缓显形，位置沿混合曲线离开冻结点
      mouseU.lerpVectors(currentMouseRef.value, wanderPosRef.value, kEase);
      fadeOpacityRef.value = Math.min(1, fadeOpacityRef.value + dt / 0.8);
    } else {
      velocityRef.value.multiplyScalar(props.inertia);
      if (velocityRef.value.lengthSq() > 1e-6) {
        mouseU.add(velocityRef.value);
      }
      // 上游静止淡出仅在关闭漂移时保留；开启时待机不淡出，等 idleDelay 后转入漂移
      if (!driftEnabled.value && idleMs > fadeDelay.value) {
        const fk = Math.min(1, (idleMs - fadeDelay.value) / fadeDuration.value);
        fadeOpacityRef.value = Math.max(0, 1 - fk);
      }
    }

    const N = trailBufRef.value.length;
    headRef.value = (headRef.value + 1) % N;
    trailBufRef.value[headRef.value].copy(mat.uniforms.iMouse.value);
    const arr = mat.uniforms.iPrevMouse.value as THREE.Vector2[];
    for (let i = 0; i < N; i++) {
      const srcIdx = (headRef.value - i + N) % N;
      arr[i].copy(trailBufRef.value[srcIdx]);
    }

    mat.uniforms.iOpacity.value = fadeOpacityRef.value;
    mat.uniforms.iIdle.value = kEase;
    mat.uniforms.iTime.value = t;

    if (filmPassRef.value?.uniforms?.iTime) {
      filmPassRef.value.uniforms.iTime.value = t;
    }

    // 指针不在页面内 → 渲染按 ~30fps 封顶省电（漂移或常驻噪点撑着循环）；在页面内满帧
    const idleCapped = !pointerActiveRef.value;
    if (!idleCapped || now - lastRenderTsRef.value >= 33) {
      lastRenderTsRef.value = now;
      comp.render();
    }

    // 常驻噪点开启时循环永不退出（无论指针在不在、漂不漂移）
    if (
      !pointerActiveRef.value &&
      fadeOpacityRef.value <= 0.001 &&
      wanderKRef.value <= 0 &&
      !pixelNoiseOn.value
    ) {
      runningRef.value = false;
      rafRef.value = null;
      return;
    }

    rafRef.value = requestAnimationFrame(animate);
  };

  const ensureLoop = () => {
    if (!runningRef.value) {
      runningRef.value = true;
      rafRef.value = requestAnimationFrame(animate);
    }
  };

  const onPointerMove = (e: PointerEvent) => {
    const rect = parent.getBoundingClientRect();
    const x = THREE.MathUtils.clamp((e.clientX - rect.left) / Math.max(1, rect.width), 0, 1);
    const y = THREE.MathUtils.clamp(1 - (e.clientY - rect.top) / Math.max(1, rect.height), 0, 1);
    currentMouseRef.value.set(x, y);
    pointerActiveRef.value = true;
    lastMoveTimeRef.value = performance.now();
    ensureLoop();
  };
  const onPointerEnter = () => {
    pointerActiveRef.value = true;
    ensureLoop();
  };
  const onPointerLeave = () => {
    pointerActiveRef.value = false;
    lastMoveTimeRef.value = performance.now();
    ensureLoop();
  };

  parent.addEventListener('pointermove', onPointerMove, { passive: true });
  parent.addEventListener('pointerenter', onPointerEnter, { passive: true });
  parent.addEventListener('pointerleave', onPointerLeave, { passive: true });

  ensureLoop();

  cleanup = () => {
    if (rafRef.value) cancelAnimationFrame(rafRef.value);
    runningRef.value = false;
    rafRef.value = null;

    parent.removeEventListener('pointermove', onPointerMove);
    parent.removeEventListener('pointerenter', onPointerEnter);
    parent.removeEventListener('pointerleave', onPointerLeave);
    resizeObsRef.value?.disconnect();

    scene.clear();
    geom.dispose();
    material.dispose();
    composer.dispose();
    renderer.dispose();

    if (renderer.domElement && renderer.domElement.parentElement) {
      renderer.domElement.parentElement.removeChild(renderer.domElement);
    }
    if (!prevParentPos || prevParentPos === 'static') {
      parent.style.position = prevParentPos;
    }
  };
};

const disposeAll = () => {
  cleanup?.();
  cleanup = null;
};

let motionMq: MediaQueryList | null = null;
const onMotionChange = (e: MediaQueryListEvent) => {
  reducedMotion.value = e.matches;
};
let schemeMq: MediaQueryList | null = null;
const onSchemeChange = (e: MediaQueryListEvent) => {
  lightScheme.value = e.matches;
};

onMounted(() => {
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    motionMq = window.matchMedia('(prefers-reduced-motion: reduce)');
    motionMq.addEventListener('change', onMotionChange);
    schemeMq = window.matchMedia('(prefers-color-scheme: light)');
    schemeMq.addEventListener('change', onSchemeChange);
  }
  setup();
});

onBeforeUnmount(() => {
  motionMq?.removeEventListener('change', onMotionChange);
  motionMq = null;
  schemeMq?.removeEventListener('change', onSchemeChange);
  schemeMq = null;
  disposeAll();
});

// 减弱动效开关实时生效：开启即拆，关闭即重建（flush post：等 v-if 把宿主节点挂回来）
watch(
  reducedMotion,
  () => {
    disposeAll();
    setup();
  },
  { flush: 'post' }
);

watch(
  () => [
    props.trailLength,
    props.inertia,
    props.grainIntensity,
    props.bloomStrength,
    props.bloomRadius,
    props.bloomThreshold,
    pixelBudget.value,
    fadeDelay.value,
    fadeDuration.value,
    isTouch.value,
    props.color,
    props.brightness,
    props.mixBlendMode,
    props.edgeIntensity
  ],
  () => {
    disposeAll();
    setup();
  },
  { flush: 'post' }
);

watch(
  () => props.color,
  () => {
    if (materialRef.value) {
      const c = new THREE.Color(props.color);
      (materialRef.value.uniforms.iBaseColor.value as THREE.Vector3).set(c.r, c.g, c.b);
    }
  }
);

watch(
  () => props.brightness,
  () => {
    if (materialRef.value) {
      materialRef.value.uniforms.iBrightness.value = props.brightness;
    }
  }
);

watch(
  () => props.edgeIntensity,
  () => {
    if (materialRef.value) {
      materialRef.value.uniforms.iEdgeIntensity.value = props.edgeIntensity;
    }
  }
);

watch(
  () => props.grainIntensity,
  () => {
    if (filmPassRef.value?.uniforms?.intensity) {
      filmPassRef.value.uniforms.intensity.value = props.grainIntensity;
    }
  }
);

watch(pixelNoiseOn, () => {
  if (materialRef.value) {
    materialRef.value.uniforms.iNoiseAmp.value = pixelNoiseOn.value ? 1 : 0;
  }
});

watch(lightScheme, () => {
  const mat = materialRef.value;
  if (!mat) return;
  const c = lightScheme.value ? NOISE_COLOR_LIGHT : NOISE_COLOR_DARK;
  (mat.uniforms.iNoiseColor.value as THREE.Vector3).set(c.r, c.g, c.b);
});

watch(
  () => props.mixBlendMode,
  () => {
    const el = rendererRef.value?.domElement;
    if (!el) return;
    if (props.mixBlendMode) {
      el.style.mixBlendMode = String(props.mixBlendMode);
    } else {
      el.style.removeProperty('mix-blend-mode');
    }
  }
);

const mergedStyle = computed(() => ({
  zIndex: props.zIndex,
  ...props.style
}));
</script>

<template>
  <!-- prefers-reduced-motion：整层不渲染（含宿主 div），监听也不注册 -->
  <div v-if="!reducedMotion" ref="containerRef" class="ghost-cursor" :class="className" :style="mergedStyle" />
</template>

<style scoped>
/* 上游 Tailwind：pointer-events-none absolute inset-0 */
.ghost-cursor {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
</style>
