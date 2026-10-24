<script setup lang="ts">
/**
 * 像素方块鼠标拖尾 —— 512² 离屏 canvas 作拖尾纹理（pointermove 按移动速度算 force，
 * radial-gradient 以 'screen' 合成盖章，每帧按 maxAge 老化重绘），CanvasTexture 送入
 * 全屏 shader，UV 量化为 gridSize×grid 网格，输出 pixelColor + 拖尾亮度作 alpha。
 * 移植自 vue-bits PixelTrail（MIT），本地副本 research/vue-bits/PixelTrail.vue；
 * props 名称与类型按 docs/CONTRACTS.md §3.3 全量保留。
 *
 * 【默认值 = 调研笔记的「明显减弱」组合，可感知但不喧宾夺主】
 *   gridSize 48（上游 40，格更细更轻）/ trailSize 0.06（上游 0.1，章更小）/
 *   maxAge 150（上游 250，寿命更短）/ interpolate 5（不变）/ color '#ffffff'，
 *   再叠加整体透明度 0.4：上游没有 opacity prop（单章 alpha 硬编码 0.2 不可调，
 *   research 笔记 PixelTrail 视觉强度参数映射），故走容器 CSS
 *   opacity: var(--pixel-trail-opacity, 0.4) —— 宿主覆盖该变量即可整体调淡。
 *   注意：docs/CONTRACTS.md §3.3 表格默认值仍为上游组，需按此同步（签名未变）。
 *
 * 与上游的其他差异（降级 / 降载）：
 *  1. 事件从「容器 pointermove」改为「window pointermove + 容器边界判定」：
 *     本组件按契约挂在 fixed 背景层且整层 pointer-events:none（§3.8），容器在
 *     内容层之下永远收不到 pointermove（research 笔记 PixelTrail 要点 ③ 的集成坑）。
 *     window 级监听 + 命中判定：容器范围内与上游行为一致，范围外忽略；
 *  2. rAF 空闲停摆（上游 rAF 常开，笔记要点 ② 指出的最大降载点）：拖尾清空且
 *     force 归零后渲染最后一帧即停，pointermove 唤醒；
 *  3. prefers-reduced-motion: reduce → 不渲染、不监听（§3.8），media query 变化实时启停；
 *  4. WebGL 上下文创建失败 → 静默降级为空层；
 *  5. 上游 3 个 Tailwind 工具类（relative w-full h-full / absolute overflow-hidden
 *     z-[1] ×2）改写为 scoped CSS。
 */
import { onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue';
import * as THREE from 'three';

interface GooeyFilterConfig {
  id: string;
  strength: number;
}

interface PixelTrailProps {
  gridSize?: number;
  trailSize?: number;
  maxAge?: number;
  interpolate?: number;
  color?: string;
  gooeyFilter?: GooeyFilterConfig;
  className?: string;
}

const props = withDefaults(defineProps<PixelTrailProps>(), {
  // 「明显减弱但可感知」组合（见文件头），非上游默认：40 / 0.1 / 250
  gridSize: 48,
  trailSize: 0.06,
  maxAge: 150,
  interpolate: 5,
  color: '#ffffff',
  gooeyFilter: undefined,
  className: ''
});

const containerRef = useTemplateRef<HTMLDivElement>('containerRef');

/** 系统要求减弱动效 → 整个拖尾不启用（不渲染、不监听） */
const reducedMotion = ref(
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
);

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.OrthographicCamera | null = null;
let mesh: THREE.Mesh | null = null;
let animationFrameId: number | null = null;
let lastTime = 0;
let containerWidth = 0;
let containerHeight = 0;

// Trail texture system (matching React's useTrailTexture config)
const TEXTURE_SIZE = 512; // React uses size: 512
const INTENSITY = 0.2;
const MIN_FORCE = 0.3;
const SMOOTHING = 0;

interface TrailPoint {
  x: number;
  y: number;
  age: number;
  force: number;
}

let trailCanvas: HTMLCanvasElement | null = null;
let trailCtx: CanvasRenderingContext2D | null = null;
let trailTexture: THREE.CanvasTexture | null = null;
let trail: TrailPoint[] = [];
let force = 0;

// Smooth average for force calculation (from drei)
function smoothAverage(current: number, measurement: number, smoothing: number = 0.9): number {
  return measurement * smoothing + current * (1.0 - smoothing);
}

// Vertex shader
const vertexShader = `
  void main() {
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

// Fragment shader for pixel grid (identical to React)
const fragmentShader = `
  uniform vec2 resolution;
  uniform sampler2D mouseTrail;
  uniform float gridSize;
  uniform vec3 pixelColor;

  vec2 coverUv(vec2 uv) {
    vec2 s = resolution.xy / max(resolution.x, resolution.y);
    vec2 newUv = (uv - 0.5) * s + 0.5;
    return clamp(newUv, 0.0, 1.0);
  }

  void main() {
    vec2 screenUv = gl_FragCoord.xy / resolution;
    vec2 uv = coverUv(screenUv);

    vec2 gridUv = fract(uv * gridSize);
    vec2 gridUvCenter = (floor(uv * gridSize) + 0.5) / gridSize;

    float trail = texture2D(mouseTrail, gridUvCenter).r;

    gl_FragColor = vec4(pixelColor, trail);
  }
`;

function hexToRgb(hex: string): THREE.Color {
  return new THREE.Color(hex);
}

// Apply coverUv transformation to convert screen coords to texture coords
// Must match the shader's coverUv EXACTLY
function screenToTextureUv(screenX: number, screenY: number): { x: number; y: number } {
  // Match shader: vec2 s = resolution.xy / max(resolution.x, resolution.y);
  const maxDim = Math.max(containerWidth, containerHeight);
  const sx = containerWidth / maxDim;
  const sy = containerHeight / maxDim;

  // Match shader: vec2 newUv = (uv - 0.5) * s + 0.5;
  const x = (screenX - 0.5) * sx + 0.5;
  const y = (screenY - 0.5) * sy + 0.5;

  return {
    x: Math.max(0, Math.min(1, x)),
    y: Math.max(0, Math.min(1, y))
  };
}

function initTrailTexture() {
  trailCanvas = document.createElement('canvas');
  trailCanvas.width = trailCanvas.height = TEXTURE_SIZE;
  trailCtx = trailCanvas.getContext('2d')!;
  trailCtx.fillStyle = 'black';
  trailCtx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  trailTexture = new THREE.CanvasTexture(trailCanvas);
  trailTexture.minFilter = THREE.NearestFilter;
  trailTexture.magFilter = THREE.NearestFilter;
  trailTexture.wrapS = THREE.ClampToEdgeWrapping;
  trailTexture.wrapT = THREE.ClampToEdgeWrapping;
}

function clearTrail() {
  if (!trailCtx) return;
  trailCtx.globalCompositeOperation = 'source-over';
  trailCtx.fillStyle = 'black';
  trailCtx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
}

function addTouch(point: { x: number; y: number }) {
  const last = trail[trail.length - 1];

  if (last) {
    const dx = last.x - point.x;
    const dy = last.y - point.y;
    const dd = dx * dx + dy * dy;

    const newForce = Math.max(MIN_FORCE, Math.min(dd * 10000, 1));
    force = smoothAverage(newForce, force, SMOOTHING);

    // Interpolation (matching drei's logic)
    if (props.interpolate > 0) {
      const lines = Math.ceil(dd / Math.pow((props.trailSize * 0.5) / props.interpolate, 2));

      if (lines > 1) {
        for (let i = 1; i < lines; i++) {
          trail.push({
            x: last.x - (dx / lines) * i,
            y: last.y - (dy / lines) * i,
            age: 0,
            force: newForce
          });
        }
      }
    }
  }

  trail.push({ x: point.x, y: point.y, age: 0, force });
  ensureLoop();
}

function drawTouch(point: TrailPoint) {
  if (!trailCtx) return;

  const pos = {
    x: point.x * TEXTURE_SIZE,
    y: (1 - point.y) * TEXTURE_SIZE
  };

  // Calculate intensity based on age (matching drei's logic)
  // React uses linear easing: ease = (x) => x (identity function)
  let intensity = 1;
  if (point.age < props.maxAge * 0.3) {
    // Fade in phase (0 to 30% of maxAge)
    intensity = point.age / (props.maxAge * 0.3);
  } else {
    // Fade out phase (30% to 100% of maxAge)
    intensity = 1 - (point.age - props.maxAge * 0.3) / (props.maxAge * 0.7);
  }

  intensity *= point.force;

  // Apply blending
  trailCtx.globalCompositeOperation = 'screen';

  const radius = TEXTURE_SIZE * props.trailSize * intensity;

  if (radius <= 0) return;

  const grd = trailCtx.createRadialGradient(
    pos.x,
    pos.y,
    Math.max(0, radius * 0.25),
    pos.x,
    pos.y,
    Math.max(0, radius)
  );
  grd.addColorStop(0, `rgba(255, 255, 255, ${INTENSITY})`);
  grd.addColorStop(1, 'rgba(0, 0, 0, 0.0)');

  trailCtx.beginPath();
  trailCtx.fillStyle = grd;
  trailCtx.arc(pos.x, pos.y, Math.max(0, radius), 0, Math.PI * 2);
  trailCtx.fill();
}

function updateTrailTexture(delta: number) {
  if (!trailCtx || !trailTexture) return;

  clearTrail();

  // Age points and remove old ones
  trail = trail.filter(point => {
    point.age += delta * 1000;
    return point.age <= props.maxAge;
  });

  // Reset force when empty
  if (!trail.length) force = 0;

  // Draw all points
  trail.forEach(point => drawTouch(point));

  trailTexture.needsUpdate = true;
}

function setupScene() {
  if (reducedMotion.value) return;

  const container = containerRef.value;
  if (!container) return;

  const width = container.clientWidth;
  const height = container.clientHeight;
  containerWidth = width;
  containerHeight = height;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  // Initialize trail texture
  initTrailTexture();

  // WebGL 上下文创建失败（无 GPU/被禁用）→ 清掉半成品，静默降级为空层
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
      powerPreference: 'high-performance'
    });
  } catch {
    disposeScene();
    return;
  }
  renderer.setSize(width, height);
  renderer.setPixelRatio(dpr);
  container.appendChild(renderer.domElement);

  // Main scene
  scene = new THREE.Scene();
  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.position.z = 1;

  // Main mesh with pixel shader
  const pixelColor = hexToRgb(props.color);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      resolution: { value: new THREE.Vector2(width * dpr, height * dpr) },
      mouseTrail: { value: trailTexture },
      gridSize: { value: props.gridSize },
      pixelColor: { value: new THREE.Vector3(pixelColor.r, pixelColor.g, pixelColor.b) }
    },
    vertexShader,
    fragmentShader,
    transparent: true
  });

  const geometry = new THREE.PlaneGeometry(2, 2);
  mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  // 事件挂 window（见文件头差异 1）：容器在内容层之下收不到 pointermove
  window.addEventListener('pointermove', handlePointerMove, { passive: true });
  window.addEventListener('resize', handleResize);

  // 上游在此启动常开 rAF；本实现空闲停摆：拖尾为空时不渲染，
  // 首次 pointermove 由 addTouch → ensureLoop 唤醒
  trail = [];
  force = 0;
  lastTime = performance.now();
}

function handlePointerMove(event: PointerEvent) {
  const container = containerRef.value;
  if (!container) return;

  const rect = container.getBoundingClientRect();
  // 容器范围外忽略（等价上游「只画容器内」的表现；window 级监听则由这里收口）
  if (
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  ) {
    return;
  }
  const screenX = (event.clientX - rect.left) / rect.width;
  const screenY = 1 - (event.clientY - rect.top) / rect.height;

  // Convert screen coordinates to texture UV space (apply coverUv transformation)
  const uv = screenToTextureUv(screenX, screenY);

  // Add touch point
  addTouch(uv);
}

/** 空闲停摆的唤醒口：拖尾在画或刚收到新点时恢复循环 */
function ensureLoop() {
  if (animationFrameId !== null) return;
  if (!renderer || !scene || !camera || !mesh) return;
  lastTime = performance.now();
  animationFrameId = requestAnimationFrame(animate);
}

function handleResize() {
  const container = containerRef.value;
  if (!container || !renderer || !mesh) return;

  const width = container.clientWidth;
  const height = container.clientHeight;
  containerWidth = width;
  containerHeight = height;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  renderer.setSize(width, height);

  const material = mesh.material as THREE.ShaderMaterial;
  material.uniforms.resolution.value.set(width * dpr, height * dpr);
}

function animate() {
  if (!renderer || !scene || !camera || !mesh) {
    animationFrameId = null;
    return;
  }

  // Calculate delta time
  const currentTime = performance.now();
  const delta = (currentTime - lastTime) / 1000;
  lastTime = currentTime;

  // Update trail texture with delta time
  updateTrailTexture(delta);

  // Render
  renderer.render(scene, camera);

  if (trail.length === 0 && force === 0) {
    // 空闲停摆：拖尾已整体淡出、最后一帧（空纹理）已上屏，不再空转
    animationFrameId = null;
    return;
  }
  animationFrameId = requestAnimationFrame(animate);
}

function disposeScene() {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  const container = containerRef.value;

  // Clear trail data
  trail = [];
  force = 0;

  if (renderer) {
    if (container && container.contains(renderer.domElement)) {
      container.removeChild(renderer.domElement);
    }
    renderer.dispose();
    renderer = null;
  }

  if (trailTexture) {
    trailTexture.dispose();
    trailTexture = null;
  }

  if (mesh) {
    (mesh.material as THREE.ShaderMaterial).dispose();
    mesh.geometry.dispose();
    mesh = null;
  }

  trailCanvas = null;
  trailCtx = null;
  scene = null;
  camera = null;
}

onMounted(() => {
  setupScene();
});

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', handlePointerMove);
  window.removeEventListener('resize', handleResize);
  disposeScene();
});

// 减弱动效开关实时生效：开启即拆（渲染层 + 监听），关闭即重建（flush post 等 v-if 挂回）
watch(
  reducedMotion,
  () => {
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('resize', handleResize);
    disposeScene();
    setupScene();
  },
  { flush: 'post' }
);

watch(
  () => [props.gridSize, props.trailSize, props.maxAge, props.interpolate, props.color],
  () => {
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('resize', handleResize);
    disposeScene();
    setupScene();
  },
  { deep: true }
);
</script>

<template>
  <!-- prefers-reduced-motion：整层不渲染 -->
  <div v-if="!reducedMotion" class="pixel-trail">
    <svg v-if="props.gooeyFilter" class="pixel-trail__svg" aria-hidden="true">
      <defs>
        <filter :id="props.gooeyFilter.id">
          <feGaussianBlur in="SourceGraphic" :stdDeviation="props.gooeyFilter.strength" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"
            result="goo"
          />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
      </defs>
    </svg>

    <!--
      整体透明度（上游没有 opacity prop）：默认 0.4，宿主覆盖 --pixel-trail-opacity 调节。
      整个组件 pointer-events:none（§3.8），指针事件由 window 级监听接管（见文件头差异 1）。
    -->
    <div
      ref="containerRef"
      class="pixel-trail__canvas"
      :class="props.className"
      :style="props.gooeyFilter ? { filter: `url(#${props.gooeyFilter.id})` } : undefined"
    />
  </div>
</template>

<style scoped>
/* 上游 Tailwind：relative w-full h-full */
.pixel-trail {
  position: relative;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

/* 上游 Tailwind：absolute overflow-hidden z-[1]；只含 defs，不参与绘制 */
.pixel-trail__svg {
  position: absolute;
  overflow: hidden;
  z-index: 1;
  width: 0;
  height: 0;
  pointer-events: none;
}

/* 上游 Tailwind：absolute z-[1] w-full h-full + 建议的 opacity-40（Tailwind 类不可用，
   折成 CSS 变量：--pixel-trail-opacity 可被宿主覆盖） */
.pixel-trail__canvas {
  position: absolute;
  z-index: 1;
  width: 100%;
  height: 100%;
  opacity: var(--pixel-trail-opacity, 0.4);
}
</style>
