<script setup lang="ts">
/*
 * 前端组件实验室（/lab）
 *
 * 实验目录由 ./catalog.ts 单一登记；页头右侧索引与顶部实验卡都读同一份数据，
 * 新增实验时只追加一条目录 + 一个同名 section + 一个源码标签。
 *
 * 当前实验：
 *   01 液态玻璃：src/effects/GlassSurface.vue（Codrift 单文件版）与
 *      ./rein-glass/ReinGlassSurface.vue + ReinGlassFilter.vue（Rein 拆分版复刻）并排；
 *   02 折射管线：四步链路 + 贴图分辨率除数（mapScale）的移动端成本说明；
 *   03 Hero Tag：src/components/hero/FeatureTag.vue（vue-bits Stack 的本站优化版）；
 *   04 Gradual Blur：src/effects/GradualBlur.vue（vue-bits GradualBlur 移植）。
 *
 * 源码面板通过 Vite 的 ?raw 直接读组件源文件，复制按钮给出的就是站内正在跑的代码。
 * 实验室只做展示，不改变站内组件的契约默认值。
 */
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { GradualBlur, GlassSurface } from '@/effects';
import FeatureTag from '@/components/hero/FeatureTag.vue';
import ReinGlassSurface from '@/components/lab/rein-glass/ReinGlassSurface.vue';
import {
  CODRAFT_GLASS,
  GLASS_PRESETS,
  REIN_GLASS,
  type GlassMaterial,
} from '@/components/lab/glass-material';
import { LAB_CATEGORIES, LAB_ENTRIES, LAB_EXPERIMENTS } from '@/components/lab/catalog';
import codriftSource from '@/effects/GlassSurface.vue?raw';
import reinSurfaceSource from '@/components/lab/rein-glass/ReinGlassSurface.vue?raw';
import reinFilterSource from '@/components/lab/rein-glass/ReinGlassFilter.vue?raw';
import featureTagSource from '@/components/hero/FeatureTag.vue?raw';
import stackMotionSource from '@/components/hero/stackMotion.ts?raw';
import gradualBlurSource from '@/effects/GradualBlur.vue?raw';

/* ---------- 调参台 ---------- */

type PresetId = 'codrift' | 'rein' | 'custom';

const material = reactive<GlassMaterial>({ ...CODRAFT_GLASS });
const preset = ref<PresetId>('codrift');

interface Control {
  key: keyof GlassMaterial;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  digits: number;
}

const controls: Control[] = [
  { key: 'borderWidth', label: '边缘厚度', unit: '', min: 0, max: 0.2, step: 0.005, digits: 3 },
  { key: 'brightness', label: '贴图亮度', unit: '%', min: 0, max: 100, step: 1, digits: 0 },
  { key: 'opacity', label: '贴图不透明度', unit: '', min: 0, max: 1, step: 0.05, digits: 2 },
  { key: 'blur', label: '贴图模糊', unit: 'px', min: 0, max: 24, step: 1, digits: 0 },
  { key: 'mapScale', label: '贴图分辨率除数', unit: '', min: 1, max: 4, step: 1, digits: 0 },
  { key: 'distortionScale', label: '折射位移', unit: 'px', min: -300, max: 0, step: 10, digits: 0 },
  { key: 'displace', label: '边缘柔化', unit: 'px', min: 0, max: 8, step: 0.1, digits: 1 },
  { key: 'saturation', label: '背景饱和度', unit: '', min: 0, max: 3, step: 0.1, digits: 1 },
  { key: 'backgroundOpacity', label: '底色浓度', unit: '', min: 0, max: 1, step: 0.02, digits: 2 },
];

const presetLabel = computed(() => {
  if (preset.value === 'codrift') return 'Codrift 默认';
  if (preset.value === 'rein') return 'Rein 默认';
  return '自定义';
});

/** 两块玻璃共用同一块半透明底；页面上直接给 fill，调参台的浓度滑杆才真正生效 */
const glassFill = computed(() => `hsl(219 46% 6% / ${material.backgroundOpacity})`);

function formatValue(control: Control): string {
  return `${material[control.key].toFixed(control.digits)}${control.unit}`;
}

function setControl(key: keyof GlassMaterial, event: Event): void {
  const input = event.target as HTMLInputElement;
  const value = Number(input.value);
  if (!Number.isFinite(value)) return;
  material[key] = value;
  preset.value = 'custom';
}

function applyPreset(id: 'codrift' | 'rein'): void {
  if (id === 'codrift') Object.assign(material, CODRAFT_GLASS);
  else Object.assign(material, REIN_GLASS);
  preset.value = id;
}

/* ---------- 目录：数据驱动，新增实验只改 catalog.ts ---------- */

const categoryGroups = LAB_CATEGORIES.map((category) => ({
  ...category,
  items: LAB_ENTRIES.filter((entry) => entry.category === category.id),
})).filter((group) => group.items.length > 0);

/** 顶部实验卡只放实验与管线深入，不含源码附录 */
const catalogEntries = LAB_ENTRIES.filter((entry) => entry.kind !== 'source');
const experimentCount = LAB_EXPERIMENTS.length;

/* ---------- 03 Hero Tag 实验 ---------- */

interface LabTagItem {
  id: string;
  label: string;
  tone: string;
}

/* 与首页身份行同一组标签与主题色（文案不复制说明，只复用标签） */
const tagItems: LabTagItem[] = [
  { id: 'aesthetic', label: '前端审美', tone: 'var(--aurora-violet)' },
  { id: 'efficiency', label: '效率至上', tone: 'var(--aurora-cyan)' },
  { id: 'output', label: '产品产出', tone: 'var(--aurora-blue)' },
  { id: 'sport', label: '运动交流', tone: 'var(--aurora-green)' },
  { id: 'music', label: '音乐爱好', tone: 'var(--accent-2)' },
];

const activeTagId = ref(tagItems[0].id);
const tagRandomRotation = ref(true);
const tagRandomAmount = ref(10);
const tagRandomOrigin = ref(true);
const activeTagLabel = computed(
  () => tagItems.find((item) => item.id === activeTagId.value)?.label ?? tagItems[0].label,
);

/* ---------- 04 Gradual Blur 实验 ---------- */

type BlurPosition = 'top' | 'bottom' | 'left' | 'right';

const BLUR_POSITIONS: Array<{ id: BlurPosition; label: string }> = [
  { id: 'top', label: '顶部' },
  { id: 'bottom', label: '底部' },
  { id: 'left', label: '左侧' },
  { id: 'right', label: '右侧' },
];

const blurPosition = ref<BlurPosition>('bottom');
const blurStrength = ref(2);
const blurHeight = ref(5);
const blurCount = ref(6);
const blurExponential = ref(false);
const blurHeightCss = computed(() => `${blurHeight.value}rem`);

/* 滚动区域里放的是原理本身，顺带说明每一层在做什么 */
const blurLines = [
  { no: '01', title: '层数 = divCount', note: '每层一个绝对定位 div' },
  { no: '02', title: '每层独立 backdrop-filter', note: '模糊的是条带背后的真实内容' },
  { no: '03', title: 'mask 控制可见区间', note: 'linear-gradient 让层只在一条边上出现' },
  { no: '04', title: '相邻 mask 交叠', note: '模糊强度从 0 逐层爬到峰值' },
  { no: '05', title: '层数越多越细腻', note: '每层多一次 backdrop 采样，也更有成本' },
  { no: '06', title: 'exponential 曲线', note: '靠边缘更陡，中心更快化开' },
  { no: '07', title: '没有 rAF', note: '静态组件，不监听滚动' },
  { no: '08', title: 'pointer-events: none', note: '条带永远不拦截点击' },
  { no: '09', title: 'position 四向', note: 'top / bottom / left / right' },
  { no: '10', title: 'target: parent | page', note: '相对父元素，或 fixed 到视口' },
  { no: '11', title: '页头正在使用', note: '滚动时让内容从页头下方化开' },
  { no: '12', title: 'reduced-motion 无需特殊处理', note: '它本来就是静态遮罩' },
];

/* ---------- 贴图分辨率除数 ---------- */

const STAGE_WIDTH = 300;
const STAGE_HEIGHT = 176;

const scaleExamples = [1, 2, 4].map((scale) => ({
  scale,
  width: Math.round(STAGE_WIDTH / scale),
  height: Math.round(STAGE_HEIGHT / scale),
  /* 单边分辨率百分比（条形长度）与像素面积百分比（右侧文本）分开看 */
  linear: 100 / scale,
  area: 100 / (scale * scale),
}));

const currentMapScale = computed(() => Math.max(1, Math.round(material.mapScale)));
const currentTexture = computed(
  () =>
    `${Math.round(STAGE_WIDTH / currentMapScale.value)} × ${Math.round(
      STAGE_HEIGHT / currentMapScale.value,
    )}`,
);

function areaLabel(area: number): string {
  return `${Number(area.toFixed(2))}%`;
}

/* ---------- 源码面板 ---------- */

interface SourceTab {
  id: string;
  label: string;
  file: string;
  code: string;
  href: string;
}

const sourceTabs: SourceTab[] = [
  {
    id: 'codrift',
    label: 'Codrift · GlassSurface.vue',
    file: 'src/effects/GlassSurface.vue',
    code: codriftSource,
    href: 'https://github.com/lumenShen/codrift-space-site/blob/main/src/effects/GlassSurface.vue',
  },
  {
    id: 'rein-surface',
    label: 'Rein 复刻 · GlassSurface.vue',
    file: 'src/components/lab/rein-glass/ReinGlassSurface.vue',
    code: reinSurfaceSource,
    href: 'https://github.com/lumenShen/Rein/blob/main/src/components/common/GlassSurface.vue',
  },
  {
    id: 'rein-filter',
    label: 'Rein 复刻 · GlassFilter.vue',
    file: 'src/components/lab/rein-glass/ReinGlassFilter.vue',
    code: reinFilterSource,
    href: 'https://github.com/lumenShen/Rein/blob/main/src/components/common/GlassFilter.vue',
  },
  {
    id: 'feature-tag',
    label: 'Hero Tag · FeatureTag.vue',
    file: 'src/components/hero/FeatureTag.vue',
    code: featureTagSource,
    href: 'https://github.com/lumenShen/codrift-space-site/blob/main/src/components/hero/FeatureTag.vue',
  },
  {
    id: 'stack-motion',
    label: 'Hero Tag · stackMotion.ts',
    file: 'src/components/hero/stackMotion.ts',
    code: stackMotionSource,
    href: 'https://github.com/lumenShen/codrift-space-site/blob/main/src/components/hero/stackMotion.ts',
  },
  {
    id: 'gradual-blur',
    label: 'Gradual Blur · GradualBlur.vue',
    file: 'src/effects/GradualBlur.vue',
    code: gradualBlurSource,
    href: 'https://github.com/lumenShen/codrift-space-site/blob/main/src/effects/GradualBlur.vue',
  },
];

const activeSourceId = ref(sourceTabs[0].id);
const activeSource = computed(
  () => sourceTabs.find((tab) => tab.id === activeSourceId.value) ?? sourceTabs[0],
);
const sourceLineCount = computed(() => activeSource.value.code.split('\n').length);

const coreSnippet = `<!-- 0. 分辨率除数：viewBox 保持实际尺寸，光栅只烘 1 / mapScale -->
<svg viewBox="0 0 300 176" width="75" height="44"><!-- mapScale = 4 -->

  <!-- 1. 位移贴图：红 / 蓝两个通道的渐变决定边缘往哪边扯 -->
  <rect width="100%" height="100%" fill="url(#red-grad)" />
  <rect width="100%" height="100%" fill="url(#blue-grad)" />
  <rect x="edge" y="edge" width="w - 2 * edge" height="h - 2 * edge"
        rx="radius" fill="hsl(0 0% 50% / .95)"
        style="filter:blur(6px)" />
</svg>

<!-- 2. 唯一一条滤镜链：贴图 → 一次位移 → 收尾柔化 -->
<filter id="glass-filter" color-interpolation-filters="sRGB">
  <feImage result="map" preserveAspectRatio="none" />
  <feDisplacementMap in="SourceGraphic" in2="map" result="output" />
  <feGaussianBlur in="output" stdDeviation="2" />
</filter>

/* 3. 表面：折射的是元素背后的真实 DOM，不是一张贴图 */
.glass {
  backdrop-filter: url(#glass-filter) saturate(1.4);
}`;

const copiedId = ref('');
let copyTimer = 0;

async function copyText(text: string, id: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // 非安全上下文 / 权限被拒时的退路：临时 textarea + execCommand
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand('copy');
    } catch {
      /* 复制失败也不打断页面 */
    }
    area.remove();
  }
  copiedId.value = id;
  window.clearTimeout(copyTimer);
  copyTimer = window.setTimeout(() => {
    copiedId.value = '';
  }, 1800);
}

function copyMaterial(): void {
  void copyText(JSON.stringify(material, null, 2), 'material');
}

/* ---------- 页内导航（hash 路由下不能用 href="#id"，会改掉路由） ---------- */

function scrollToSection(id: string): void {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.getElementById(id)?.scrollIntoView({
    behavior: reduce ? 'auto' : 'smooth',
    block: 'start',
  });
}

/* ---------- 能力检测角标 ---------- */

const refractionStatus = ref<'refracting' | 'fallback'>('fallback');

onMounted(() => {
  const ua = navigator.userAgent;
  const safari = /Safari/.test(ua) && !/Chrome/.test(ua);
  const firefox = /Firefox/.test(ua);
  const probe = document.createElement('div');
  probe.style.setProperty('backdrop-filter', 'url(#lab-probe)');
  const supported =
    !safari && !firefox && probe.style.getPropertyValue('backdrop-filter') !== '';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  refractionStatus.value = supported && !reduce ? 'refracting' : 'fallback';
});

onBeforeUnmount(() => {
  window.clearTimeout(copyTimer);
});

const differences = [
  {
    label: '组件边界',
    codrift: '单文件：表面 + 滤镜定义合在一起，放进任何 Vue 3 + TS 项目即可用。',
    rein: '拆两半：GlassSurface 管表面，GlassFilter 管滤镜；同一段滤镜还能借给非玻璃悬浮条。',
  },
  {
    label: '折射开关',
    codrift: '运行时能力检测（backdrop-filter: url() 只有 Chromium 系认）+ prefers-reduced-motion。',
    rein: '画质档位决定：只有「超高」档点亮折射，低画质档直接走毛玻璃。',
  },
  {
    label: '材质默认',
    codrift: '0.02 薄边 / -150 位移 / 0.72 厚底：压在照片、列表等不可控内容上也能托住白字。',
    rein: '0.06 窄边 / -180 位移 / 0.10 透心：让折射层背后就是页面本身，适合 Dock 与悬浮条。',
  },
  {
    label: '主题跟随',
    codrift: '跟随站点 html[data-theme]，底色读 --glass-refract-fill；tint 可强制压暗。',
    rein: '跟随系统 prefers-color-scheme；tint 可覆盖，压在彩色照片上时手动指定 dark。',
  },
  {
    label: '调参方式',
    codrift: 'props 默认值写进组件，产品契约钉死后调用方只给尺寸与圆角。',
    rein: 'glassParams 调节面板 + localStorage 会话；调用方不传就用当前生效值。',
  },
  {
    label: '适用尺寸',
    codrift: '44px 胶囊按钮到整块面板；mapScale 4 先省贴图成本。',
    rein: '54–58px 的 UI 表面（Dock / 悬浮条）；mapScale 1 按元素像素烘，边缘更准。',
  },
  {
    label: '移动端成本',
    codrift: '默认 mapScale 4：贴图长宽各 ÷4，像素面积只剩 1/16，渐变仍平滑。',
    rein: '默认 mapScale 1：每个元素像素都参与烘图，桌面端优先保边缘精度。',
  },
];
</script>

<template>
  <main class="page-lab">
    <header class="lab-hero">
      <div class="lab-hero-copy">
        <p class="lab-kicker"><span class="lab-dot" aria-hidden="true"></span>COMPONENT LAB / FRONTEND</p>
        <h1>前端组件<br /><em>实验室</em></h1>
        <p class="lab-lede">
          这里不放截图，放能摸的实现。液态玻璃、身份行牌堆、渐进模糊三组实验，
          连同折射管线与源码一起摊开；每个实验都能现场调参，源码就是站内正在跑的那一份。
        </p>
        <div class="lab-hero-meta">
          <span>{{ experimentCount }} 个组件实验</span>
          <span>2 套玻璃实现</span>
          <span>9 个材质参数</span>
          <span :data-status="refractionStatus">
            {{ refractionStatus === 'refracting' ? '当前：完整折射' : '当前：毛玻璃退化' }}
          </span>
        </div>

        <nav class="lab-catalog" aria-label="实验目录">
          <div class="catalog-head">
            <span>LAB INDEX</span>
            <span class="catalog-meta">
              {{ experimentCount }} 个组件实验 · 1 条折射管线 ·
              <button type="button" class="catalog-source-link" @click="scrollToSection('source')">
                源码附录 ↓
              </button>
            </span>
          </div>
          <div class="catalog-grid">
            <button
              v-for="entry in catalogEntries"
              :key="entry.id"
              type="button"
              class="catalog-card"
              @click="scrollToSection(entry.id)"
            >
              <span class="catalog-top">
                <span class="catalog-no">{{ entry.no }}</span>
                <span class="catalog-kind">{{ entry.kind === 'experiment' ? '实验' : '深入' }}</span>
              </span>
              <span class="catalog-category">{{ entry.en }}</span>
              <span class="catalog-title">{{ entry.title }}</span>
              <span class="catalog-summary">{{ entry.summary }}</span>
              <span class="catalog-tags">
                <span v-for="tag in entry.tags" :key="tag">{{ tag }}</span>
              </span>
            </button>
          </div>
        </nav>
      </div>

      <aside class="lab-hero-aside" aria-label="实验目录">
        <p class="aside-kicker">LAB INDEX / 实验目录</p>
        <div v-for="group in categoryGroups" :key="group.id" class="aside-group">
          <p class="aside-group-label">
            {{ group.label }}<span>{{ group.en }}</span>
          </p>
          <button
            v-for="entry in group.items"
            :key="entry.id"
            type="button"
            class="aside-link"
            @click="scrollToSection(entry.id)"
          >
            <span class="aside-no">{{ entry.no }}</span>
            <span class="aside-name">
              {{ entry.title }}
              <small>{{ entry.en }}</small>
            </span>
          </button>
        </div>
        <p class="aside-note">
          折射只在 Chromium 系可见；Safari / Firefox 会落在同一套毛玻璃退化路径上——
          这也是实现的一部分，不是补丁。
        </p>
      </aside>
    </header>

    <section id="glass" class="lab-section">
      <header class="lab-section-head">
        <span class="section-no">01</span>
        <div class="section-title">
          <p class="section-kicker">EXPERIMENT / LIQUID GLASS</p>
          <h2>一块玻璃，两种产品语境</h2>
          <p>
            两块玻璃都由 SVG 位移滤镜折射<strong>真实背景</strong>：贴图在边缘拉出红 / 蓝通道差，
            中心梯度为零所以保持清晰。左与右的差别不在数学，在封装与出厂材质。
          </p>
        </div>
      </header>

      <div class="glass-stage">
        <div class="glass-scene" aria-hidden="true">
          <span class="scene-ring"></span>
          <span class="scene-stripes"></span>
          <span class="scene-word">LIQUID</span>
          <span class="scene-word scene-word--two">GLASS</span>
          <span class="scene-caption">CODRAFT × REIN / SVG DISPLACEMENT</span>
        </div>

        <div class="glass-samples">
          <div class="glass-sample">
            <GlassSurface
              class="stage-glass"
              :width="300"
              :height="176"
              :border-radius="28"
              :border-width="material.borderWidth"
              :brightness="material.brightness"
              :opacity="material.opacity"
              :blur="material.blur"
              :map-scale="material.mapScale"
              :distortion-scale="material.distortionScale"
              :displace="material.displace"
              :saturation="material.saturation"
              :background-opacity="material.backgroundOpacity"
              :fill="glassFill"
              tint="dark"
            >
              <div class="glass-demo">
                <span class="glass-demo-kicker">CODRAFT / SITE</span>
                <strong>单文件封装</strong>
                <span class="glass-demo-chip">表面 + 滤镜定义</span>
              </div>
            </GlassSurface>
          </div>

          <div class="glass-sample">
            <ReinGlassSurface
              class="stage-glass"
              :width="300"
              :height="176"
              :border-radius="28"
              :border-width="material.borderWidth"
              :brightness="material.brightness"
              :opacity="material.opacity"
              :blur="material.blur"
              :map-scale="material.mapScale"
              :distortion-scale="material.distortionScale"
              :displace="material.displace"
              :saturation="material.saturation"
              :background-opacity="material.backgroundOpacity"
              :fill="glassFill"
              tint="dark"
            >
              <div class="glass-demo">
                <span class="glass-demo-kicker">REIN / DESKTOP</span>
                <strong>拆分滤镜</strong>
                <span class="glass-demo-chip">GlassSurface + GlassFilter</span>
              </div>
            </ReinGlassSurface>
          </div>
        </div>
      </div>

      <div class="sample-notes">
        <article>
          <span class="sample-tag">CODRAFT / SITE</span>
          <h3>单文件 · 跟随站点主题</h3>
          <p>
            表面与滤镜定义合成一个组件，唯一依赖是 Vue 本身。折射开关走运行时能力检测，
            底色读站点令牌；默认值服务于「玻璃压在不可控内容上」的按钮场景。
          </p>
        </article>
        <article>
          <span class="sample-tag">REIN / DESKTOP</span>
          <h3>拆分 · 滤镜可以出借</h3>
          <p>
            滤镜定义单独成组件，同一段 <code>url(#id)</code> 还能挂到悬浮条、底栏输入条上。
            默认值按 54–58px 的 UI 尺寸标定，底色压到 0.1，折射更接近「一层薄膜」。
          </p>
        </article>
      </div>

      <div class="lab-console">
        <header class="console-head">
          <div>
            <p class="console-kicker">MATERIAL / LIVE</p>
            <h3>调参台</h3>
          </div>
          <div class="preset-group" role="group" aria-label="材质预设">
            <button
              v-for="item in GLASS_PRESETS"
              :key="item.id"
              type="button"
              class="preset-btn"
              :class="{ 'is-active': preset === item.id }"
              :aria-pressed="preset === item.id"
              @click="applyPreset(item.id)"
            >
              <strong>{{ item.label }}</strong>
              <small>{{ item.note }}</small>
            </button>
          </div>
        </header>

        <div class="console-controls">
          <label v-for="control in controls" :key="control.key" class="control">
            <span class="control-line">
              <span>{{ control.label }}</span>
              <output>{{ formatValue(control) }}</output>
            </span>
            <input
              type="range"
              :value="material[control.key]"
              :min="control.min"
              :max="control.max"
              :step="control.step"
              @input="setControl(control.key, $event)"
            />
          </label>
        </div>

        <footer class="console-foot">
          <span>当前材质：{{ presetLabel }} · 两块玻璃共用同一组参数</span>
          <button type="button" class="ghost-btn" @click="copyMaterial">
            {{ copiedId === 'material' ? '已复制参数' : '复制这组参数' }}
          </button>
        </footer>
      </div>
    </section>

    <section id="pipeline" class="lab-section">
      <header class="lab-section-head">
        <span class="section-no">02</span>
        <div class="section-title">
          <p class="section-kicker">PIPELINE / FOUR STEPS + ONE PERFORMANCE VALVE</p>
          <h2>折射是怎么画出来的</h2>
          <p>
            不是贴一张玻璃的 PNG，也不是简单的模糊。四步之后，玻璃背后的文字、色块、
            滚动内容都会跟着边缘一起弯；最后再拧一下<strong>贴图分辨率除数</strong>，
            把移动端的渲染压力降下来。
          </p>
        </div>
      </header>

      <div class="pipeline-grid">
        <article class="pipeline-card">
          <span>01 / 贴图</span>
          <h3>按尺寸烘一张边缘梯度图</h3>
          <p>底黑，叠红 / 蓝两道渐隐，再内缩一块带模糊的圆角亮块。亮块的模糊半径就是玻璃的厚度。</p>
        </article>
        <article class="pipeline-card">
          <span>02 / 位移</span>
          <h3>feDisplacementMap 扯背景</h3>
          <p>红通道决定 x 位移、绿通道决定 y 位移。中心梯度为零，所以中心不位移、只有边缘被拉扯。</p>
        </article>
        <article class="pipeline-card">
          <span>03 / 合成</span>
          <h3>backdrop-filter 引用滤镜</h3>
          <p>表面写 <code>url(#id)</code>，浏览器拿元素背后的真实 DOM 过滤镜；不是一张固定贴图。</p>
        </article>
        <article class="pipeline-card">
          <span>04 / 退化</span>
          <h3>不支持的浏览器也有下台阶</h3>
          <p>不认 url() → 普通毛玻璃；连模糊都不支持 → 半透明实底；reduced-transparency → 近实底。</p>
        </article>
      </div>

      <div class="perf-panel">
        <div class="perf-copy">
          <p class="section-kicker">OPTIMIZATION / TEXTURE SCALE</p>
          <h3>贴图分辨率除数：省 15/16 的像素，边缘几乎不变</h3>
          <p>
            <code>viewBox</code> 始终是元素的实际尺寸，只把根 <code>&lt;svg&gt;</code> 的
            <code>width / height</code> 除以 <code>mapScale</code>；<code>feImage</code> 再用
            <code>preserveAspectRatio="none"</code> 把它拉回原尺寸。贴图本身是一条平滑渐变，
            降采样只是把斜坡采得粗一点，位移量仍是连续量，误差落回亚像素。
          </p>
          <ul class="perf-list">
            <li><strong>÷2</strong>：长宽各减半，像素面积剩 25%。</li>
            <li><strong>÷4</strong>：长宽各四分之一，像素面积只剩 6.25%，Codrift 默认值。</li>
            <li>移动端要烘、要采样的贴图像素只有原来的 1/16，玻璃边缘的观感几乎没有折扣。</li>
          </ul>
          <p class="perf-live">
            当前调参：<strong>÷{{ currentMapScale }}</strong>，300 × 176 的表面只烘
            <strong>{{ currentTexture }}</strong> 的位移图。
          </p>
        </div>

        <div class="perf-diagram" aria-label="贴图分辨率示例">
          <div
            v-for="item in scaleExamples"
            :key="item.scale"
            class="perf-scale"
            :class="{ 'is-current': currentMapScale === item.scale }"
          >
            <span class="perf-scale-label">÷{{ item.scale }}</span>
            <span class="perf-bar"><i :style="{ width: `${item.linear}%` }"></i></span>
            <span class="perf-scale-value">
              {{ item.width }} × {{ item.height }}
              <small>{{ areaLabel(item.area) }} 像素</small>
            </span>
          </div>
          <p class="perf-foot">条形 = 单边分辨率；右侧 = 像素面积</p>
        </div>
      </div>

      <div class="snippet-block">
        <div class="snippet-head">
          <span>核心片段 / SVG DISPLACEMENT</span>
          <button type="button" class="ghost-btn" @click="copyText(coreSnippet, 'core')">
            {{ copiedId === 'core' ? '已复制片段' : '复制片段' }}
          </button>
        </div>
        <pre class="snippet-code"><code>{{ coreSnippet }}</code></pre>
      </div>

      <div class="difference-wrap">
        <table class="difference-table">
          <caption>Codrift 与 Rein 的封装差异</caption>
          <thead>
            <tr>
              <th scope="col">维度</th>
              <th scope="col">Codrift / 站点版</th>
              <th scope="col">Rein / 桌面版</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in differences" :key="row.label">
              <th scope="row">{{ row.label }}</th>
              <td>{{ row.codrift }}</td>
              <td>{{ row.rein }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section id="hero-tag" class="lab-section">
      <header class="lab-section-head">
        <span class="section-no">03</span>
        <div class="section-title">
          <p class="section-kicker">EXPERIMENT / INTERACTION</p>
          <h2>Hero Tag：一副能甩的牌堆</h2>
          <p>
            身份行里的特色胶囊不再是一枚静态标签：五张卡同格叠放，按下 1:1 跟手，
            松手交给弹簧，甩出或点一下都能换牌。<strong>vue-bits Stack</strong> 的本站优化版，
            首页身份行正在用同一个组件，这里把交互拆开给你玩。
          </p>
        </div>
      </header>

      <div class="tag-stage">
        <div class="tag-scene" aria-hidden="true"></div>
        <div class="tag-demo">
          <p class="tag-demo-line">
            <span>我</span>
            <strong>LumenShen</strong>
            <span class="tag-demo-former">（旧名 gozaoo）</span>
            <FeatureTag
              class="tag-demo-ft"
              :items="tagItems"
              v-model:active-id="activeTagId"
              :random-rotation="tagRandomRotation"
              :random-rotation-amount="tagRandomAmount"
              :random-rotation-origin-offset="tagRandomOrigin"
            />
          </p>
          <p class="tag-demo-current">
            当前：<strong>{{ activeTagLabel }}</strong>
            <span aria-hidden="true">·</span>
            拖动 / 甩出 / 点击换牌
          </p>
        </div>
      </div>

      <div class="tag-notes">
        <article>
          <span class="sample-tag">01 / DRAG</span>
          <h3>1:1 跟手，松手才交给弹簧</h3>
          <p>
            位移阈值 0.32×卡宽，甩出速度阈值 4.2×卡宽/s；松手把指针末速注入 x/y 弹簧，
            卡片顺着动量飞出去再收回牌堆，未过阈值也保留半速回弹。
          </p>
        </article>
        <article>
          <span class="sample-tag">02 / SWAP</span>
          <h3>两拍换牌，不是瞬间换层</h3>
          <p>
            旧顶卡先下压 2em，沉到首峰才降 z-index、换 activeId；随后在底层回弹。
            每张后方卡的随机倾角与支点只抽一次，换牌不重新抖。
          </p>
        </article>
        <article>
          <span class="sample-tag">03 / A11Y</span>
          <h3>只有顶卡可聚焦</h3>
          <p>
            后方卡 disabled + aria-hidden；Enter/Space 换牌，方向键前后切换，
            aria-live 只在手动换牌时播报；reduced-motion 关闭自动轮播。
          </p>
        </article>
      </div>

      <div class="lab-console tag-console">
        <header class="console-head">
          <div>
            <p class="console-kicker">STACK / LIVE</p>
            <h3>牌堆参数</h3>
          </div>
          <span class="console-badge">5 张卡 · 约 5s 自动换牌</span>
        </header>
        <div class="console-controls tag-controls">
          <label class="control control--toggle">
            <span class="control-line">
              <span>后方卡随机倾角</span>
              <output>{{ tagRandomRotation ? '开' : '关' }}</output>
            </span>
            <input v-model="tagRandomRotation" type="checkbox" />
          </label>
          <label class="control">
            <span class="control-line">
              <span>随机倾角幅度</span>
              <output>{{ tagRandomAmount.toFixed(0) }}°</output>
            </span>
            <input
              v-model.number="tagRandomAmount"
              type="range"
              min="0"
              max="20"
              step="1"
              :disabled="!tagRandomRotation"
            />
          </label>
          <label class="control control--toggle">
            <span class="control-line">
              <span>随机旋转支点</span>
              <output>{{ tagRandomOrigin ? '开' : '关' }}</output>
            </span>
            <input v-model="tagRandomOrigin" type="checkbox" />
          </label>
        </div>
      </div>

      <div class="learning-source">
        <span>学习来源</span>
        <a
          href="https://github.com/lumenShen/codrift-space-site/blob/main/research/vue-bits/Stack.vue"
          target="_blank"
          rel="noopener noreferrer"
        >
          vue-bits Stack · 研究存档 ↗
        </a>
        <a
          href="https://github.com/lumenShen/codrift-space-site/blob/main/src/components/hero/FeatureTag.vue"
          target="_blank"
          rel="noopener noreferrer"
        >
          本站实现 · FeatureTag.vue ↗
        </a>
      </div>
    </section>

    <section id="gradual-blur" class="lab-section">
      <header class="lab-section-head">
        <span class="section-no">04</span>
        <div class="section-title">
          <p class="section-kicker">EXPERIMENT / MOTION</p>
          <h2>渐进模糊：让滚动在边缘化开</h2>
          <p>
            <code>divCount</code> 层绝对定位 div，每层一个 <code>backdrop-filter: blur()</code>，
            再用 <code>linear-gradient</code> mask 限定可见区间。相邻 mask 交叠，模糊强度就从 0
            逐层爬到峰值。移植自 <strong>vue-bits GradualBlur</strong>，本站页头正在用同一个组件。
          </p>
        </div>
      </header>

      <div class="blur-layout">
        <div class="blur-stage">
          <div class="blur-scene" aria-hidden="true"></div>
          <div class="blur-feed">
            <p class="blur-feed-head">ROLLING LOG / 滚动这块区域</p>
            <p v-for="line in blurLines" :key="line.no" class="blur-line">
              <span>{{ line.no }}</span>
              <strong>{{ line.title }}</strong>
              <small>{{ line.note }}</small>
            </p>
          </div>
          <GradualBlur
            :position="blurPosition"
            :height="blurHeightCss"
            :strength="blurStrength"
            :div-count="blurCount"
            :exponential="blurExponential"
            :z-index="3"
          />
        </div>

        <div class="lab-console blur-console">
          <header class="console-head">
            <div>
              <p class="console-kicker">BLUR / LIVE</p>
              <h3>条带参数</h3>
            </div>
            <span class="console-badge">{{ blurCount }} 层</span>
          </header>
          <div class="blur-console-body">
            <div class="segmented" role="group" aria-label="条带位置">
              <button
                v-for="item in BLUR_POSITIONS"
                :key="item.id"
                type="button"
                class="seg-btn"
                :class="{ 'is-active': blurPosition === item.id }"
                :aria-pressed="blurPosition === item.id"
                @click="blurPosition = item.id"
              >
                {{ item.label }}
              </button>
            </div>
            <label class="control">
              <span class="control-line">
                <span>模糊强度</span>
                <output>{{ blurStrength.toFixed(1) }}</output>
              </span>
              <input v-model.number="blurStrength" type="range" min="0.5" max="6" step="0.1" />
            </label>
            <label class="control">
              <span class="control-line">
                <span>条带高度</span>
                <output>{{ blurHeight.toFixed(1) }}rem</output>
              </span>
              <input v-model.number="blurHeight" type="range" min="2" max="10" step="0.5" />
            </label>
            <label class="control">
              <span class="control-line">
                <span>层数 divCount</span>
                <output>{{ blurCount }}</output>
              </span>
              <input v-model.number="blurCount" type="range" min="1" max="12" step="1" />
            </label>
            <label class="control control--toggle">
              <span class="control-line">
                <span>指数曲线 exponential</span>
                <output>{{ blurExponential ? '开' : '关' }}</output>
              </span>
              <input v-model="blurExponential" type="checkbox" />
            </label>
          </div>
        </div>
      </div>

      <div class="blur-notes">
        <article>
          <span class="sample-tag">HOW / MASK</span>
          <h3>模糊是一条渐变，不是一条实线</h3>
          <p>
            每层 div 的 <code>mask-image</code> 只让它在条带的一小段里出现；层与层之间重叠，
            形成从透明到峰值 blur 的连续斜坡。层数越多，台阶越细，但 backdrop 采样也越多。
          </p>
        </article>
        <article>
          <span class="sample-tag">WHY / STATIC</span>
          <h3>它自己不动，所以没有 rAF</h3>
          <p>
            组件不监听滚动、不跑动画帧，条带只负责“盖住并模糊”；内容滚动时，背后的世界在动，
            模糊自然跟着更新。reduced-motion 下不需要额外降级。
          </p>
        </article>
        <article>
          <span class="sample-tag">WHERE / USE</span>
          <h3>页头与底部工具条</h3>
          <p>
            本站页头用 <code>position="top"</code> + <code>target="parent"</code>，
            让滚动内容从页头下方逐渐化开；改 <code>position</code> 就能把同一条带放到任意边。
          </p>
        </article>
      </div>

      <div class="learning-source">
        <span>学习来源</span>
        <a
          href="https://vue-bits.nodejs.cn/animations/gradual-blur"
          target="_blank"
          rel="noopener noreferrer"
        >
          vue-bits · Gradual Blur ↗
        </a>
        <a
          href="https://github.com/lumenShen/codrift-space-site/blob/main/src/effects/GradualBlur.vue"
          target="_blank"
          rel="noopener noreferrer"
        >
          本站实现 · GradualBlur.vue ↗
        </a>
      </div>
    </section>

    <section id="source" class="lab-section">
      <header class="lab-section-head">
        <span class="section-no">05</span>
        <div class="section-title">
          <p class="section-kicker">SOURCE / COPY &amp; RUN</p>
          <h2>源码就摊在这里</h2>
          <p>
            面板里的代码由 Vite 的 <code>?raw</code> 直接读站内源文件，不是另外维护的示例。
            复制走剪贴板，原文件链接指向 GitHub。
          </p>
        </div>
      </header>

      <div class="source-panel">
        <div class="source-toolbar">
          <div class="source-tabs" role="group" aria-label="选择源码文件">
            <button
              v-for="tab in sourceTabs"
              :key="tab.id"
              type="button"
              class="source-tab"
              :class="{ 'is-active': activeSourceId === tab.id }"
              :aria-pressed="activeSourceId === tab.id"
              @click="activeSourceId = tab.id"
            >
              {{ tab.label }}
            </button>
          </div>
          <div class="source-actions">
            <a :href="activeSource.href" target="_blank" rel="noopener noreferrer">
              GitHub 原文件 ↗
            </a>
            <button
              type="button"
              class="ghost-btn"
              @click="copyText(activeSource.code, activeSource.id)"
            >
              {{ copiedId === activeSource.id ? '已复制源码' : '复制源码' }}
            </button>
          </div>
        </div>

        <p class="source-path">
          <code>{{ activeSource.file }}</code>
          <span>{{ sourceLineCount }} 行</span>
        </p>

        <details class="source-details">
          <summary>展开完整源码</summary>
          <pre class="source-code"><code>{{ activeSource.code }}</code></pre>
        </details>
      </div>
    </section>

    <footer class="lab-foot">
      <p>
        液态玻璃源自 vue-bits GlassSurface（MIT），Rein 版在实验室内复刻；Hero Tag 改造自
        vue-bits Stack；Gradual Blur 移植自
        <a href="https://vue-bits.nodejs.cn/animations/gradual-blur" target="_blank" rel="noopener noreferrer">vue-bits GradualBlur</a>（MIT）。
        Rein 原文件见
        <a href="https://github.com/lumenShen/Rein/blob/main/src/components/common/GlassSurface.vue" target="_blank" rel="noopener noreferrer">GlassSurface.vue</a>
        与
        <a href="https://github.com/lumenShen/Rein/blob/main/src/components/common/GlassFilter.vue" target="_blank" rel="noopener noreferrer">GlassFilter.vue</a>。
      </p>
      <p>实验记录：Codrift / 2026.10</p>
    </footer>
  </main>
</template>

<style scoped>
.page-lab {
  padding-bottom: var(--space-9);
}

/* ---- hero ---- */
.lab-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(260px, 0.65fr);
  gap: var(--space-8);
  align-items: start;
  padding: var(--space-4) 0 var(--space-8);
  border-bottom: 1px solid var(--line);
}

.lab-kicker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 var(--space-4);
  color: var(--fg-2);
  font-size: 0.68rem;
  font-weight: 650;
  letter-spacing: 0.14em;
}

.lab-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent-2);
  box-shadow: 0 0 14px var(--accent-2);
}

.lab-hero h1 {
  margin: 0;
  color: var(--fg-0);
  font-size: clamp(2.8rem, 7.4vw, 4.8rem);
  font-weight: 800;
  letter-spacing: -0.045em;
  line-height: 0.98;
}

.lab-hero h1 em {
  color: transparent;
  font-style: normal;
  -webkit-text-stroke: 1.5px var(--accent-text);
}

.lab-lede {
  max-width: 38em;
  margin: var(--space-5) 0 0;
  color: var(--fg-1);
  font-size: 0.94rem;
  line-height: 1.9;
}

.lab-hero-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-5);
}

.lab-hero-meta span {
  padding: 4px 10px;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-full);
  color: var(--fg-2);
  font-family: var(--font-mono);
  font-size: 0.66rem;
  letter-spacing: 0.03em;
}

.lab-hero-meta span[data-status='refracting'] {
  border-color: var(--accent-line);
  color: var(--accent-strong);
}

.lab-hero-aside {
  padding: var(--space-5);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--glass-bg);
  box-shadow: var(--shadow-1), var(--glass-insets);
}

.aside-kicker {
  margin: 0 0 var(--space-4);
  color: var(--fg-2);
  font-size: 0.62rem;
  font-weight: 650;
  letter-spacing: 0.14em;
}

.aside-group + .aside-group {
  margin-top: 4px;
}

.aside-group-label {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
  margin: 0;
  padding: 12px 0 4px;
  border-top: 1px solid var(--line);
  color: var(--fg-1);
  font-size: 0.62rem;
  font-weight: 650;
  letter-spacing: 0.1em;
}

.aside-group-label span {
  color: var(--fg-2);
  font-family: var(--font-mono);
  font-size: 0.54rem;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.aside-link {
  display: flex;
  width: 100%;
  align-items: center;
  gap: var(--space-3);
  padding: 7px 0;
  border: 0;
  background: transparent;
  color: var(--fg-1);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: color var(--dur-fast) ease-out;
}

.aside-link:hover {
  color: var(--accent-strong);
}

.aside-no {
  flex: none;
  color: var(--fg-2);
  font-family: var(--font-mono);
  font-size: 0.62rem;
  font-variant-numeric: tabular-nums;
}

.aside-name {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 1px;
  font-size: 0.86rem;
}

.aside-name small {
  overflow: hidden;
  color: var(--fg-2);
  font-family: var(--font-mono);
  font-size: 0.54rem;
  letter-spacing: 0.03em;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.aside-note {
  margin: var(--space-4) 0 0;
  padding-top: var(--space-4);
  border-top: 1px solid var(--line);
  color: var(--fg-2);
  font-size: 0.72rem;
  line-height: 1.75;
}

/* ---- 实验目录卡 ---- */
.lab-catalog {
  padding: var(--space-6) 0 0;
}

.catalog-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
  color: var(--fg-2);
  font-family: var(--font-mono);
  font-size: 0.6rem;
  letter-spacing: 0.1em;
}

.catalog-meta {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px;
  letter-spacing: 0.02em;
}

.catalog-source-link {
  padding: 0;
  border: 0;
  background: none;
  color: var(--accent-text);
  font: inherit;
  letter-spacing: inherit;
  cursor: pointer;
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 2px;
}

.catalog-source-link:hover {
  color: var(--accent-strong);
}

.catalog-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

.catalog-card {
  display: flex;
  min-height: 160px;
  flex-direction: column;
  align-items: flex-start;
  padding: var(--space-4);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: var(--glass-bg);
  color: var(--fg-1);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color var(--dur-base) var(--ease-out-quart),
    background-color var(--dur-base) var(--ease-out-quart),
    box-shadow var(--dur-base) var(--ease-out-quart),
    transform var(--dur-base) var(--ease-out-quart);
}

.catalog-card:hover {
  border-color: var(--accent-line);
  background: color-mix(in srgb, var(--accent-dim) 55%, var(--glass-bg));
  box-shadow: var(--shadow-1);
  transform: translateY(-2px);
}

.catalog-top {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.catalog-no {
  color: var(--fg-2);
  font-family: var(--font-mono);
  font-size: 0.62rem;
  font-variant-numeric: tabular-nums;
}

.catalog-kind {
  padding: 2px 8px;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-full);
  color: var(--fg-2);
  font-family: var(--font-mono);
  font-size: 0.54rem;
  letter-spacing: 0.06em;
}

.catalog-category {
  color: var(--accent-text);
  font-family: var(--font-mono);
  font-size: 0.56rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.catalog-title {
  display: block;
  margin-top: 4px;
  color: var(--fg-0);
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.catalog-summary {
  display: block;
  margin-top: 6px;
  color: var(--fg-2);
  font-size: 0.76rem;
  line-height: 1.7;
}

.catalog-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: auto;
  padding-top: var(--space-3);
}

.catalog-tags span {
  padding: 2px 7px;
  border: 1px solid var(--line);
  border-radius: var(--radius-full);
  color: var(--fg-2);
  font-family: var(--font-mono);
  font-size: 0.52rem;
  letter-spacing: 0.02em;
}

/* ---- 通用 section ---- */
.lab-section {
  padding: var(--space-8) 0;
  border-bottom: 1px solid var(--line);
  scroll-margin-top: 6rem;
}

.lab-section-head {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--space-5);
  align-items: start;
  margin-bottom: var(--space-6);
}

.section-no {
  padding-top: 6px;
  color: var(--fg-2);
  font-family: var(--font-display);
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  font-variant-numeric: tabular-nums;
}

.section-kicker {
  margin: 0 0 var(--space-3);
  color: var(--accent-text);
  font-size: 0.64rem;
  font-weight: 650;
  letter-spacing: 0.15em;
}

.section-title h2 {
  margin: 0;
  color: var(--fg-0);
  font-size: clamp(1.5rem, 3.4vw, 2.1rem);
  font-weight: 750;
  letter-spacing: -0.025em;
}

.section-title > p:not(.section-kicker) {
  max-width: 60em;
  margin: var(--space-3) 0 0;
  color: var(--fg-2);
  font-size: 0.88rem;
  line-height: 1.85;
}

.section-title strong {
  color: var(--fg-0);
  font-weight: 600;
}

/* ---- 玻璃舞台 ---- */
.glass-stage {
  position: relative;
  display: flex;
  min-height: 470px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-lg);
  background: var(--bg-0);
  isolation: isolate;
}

.glass-scene {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background:
    radial-gradient(58% 80% at 18% 18%, rgba(255, 154, 77, 0.95), transparent 62%),
    radial-gradient(52% 74% at 84% 16%, rgba(56, 224, 255, 0.82), transparent 60%),
    radial-gradient(78% 88% at 62% 96%, rgba(79, 140, 255, 0.95), transparent 62%),
    linear-gradient(118deg, #071022 4%, #12254a 42%, #24123a 72%, #071022 100%);
}

.glass-scene::before {
  content: '';
  position: absolute;
  inset: -20%;
  background-image:
    linear-gradient(to right, rgba(255, 255, 255, 0.16) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.16) 1px, transparent 1px);
  background-size: 52px 52px;
  opacity: 0.32;
  transform: rotate(-8deg);
}

.scene-ring {
  position: absolute;
  top: -54px;
  right: 9%;
  width: 260px;
  height: 260px;
  border: 2px solid rgba(255, 255, 255, 0.55);
  border-radius: 50%;
  box-shadow:
    0 0 0 22px rgba(255, 255, 255, 0.05),
    0 0 0 64px rgba(255, 255, 255, 0.03);
}

.scene-stripes {
  position: absolute;
  right: -12%;
  bottom: 6%;
  left: -12%;
  height: 37%;
  background: repeating-linear-gradient(
    90deg,
    #ff9a4d 0 26px,
    #38e0ff 26px 52px,
    #4f8cff 52px 78px,
    #46e2a0 78px 104px,
    #8b7bff 104px 130px
  );
  opacity: 0.7;
  transform: rotate(-7deg);
}

.scene-word {
  position: absolute;
  top: 6%;
  left: 5%;
  color: transparent;
  font-family: var(--font-display);
  font-size: clamp(4.4rem, 12vw, 8.4rem);
  font-weight: 900;
  letter-spacing: -0.06em;
  line-height: 0.8;
  -webkit-text-stroke: 1px rgba(255, 255, 255, 0.42);
  white-space: nowrap;
}

.scene-word--two {
  top: auto;
  right: 4%;
  bottom: 4%;
  left: auto;
  color: rgba(255, 255, 255, 0.12);
  -webkit-text-stroke: 1px rgba(255, 255, 255, 0.2);
}

.scene-caption {
  position: absolute;
  bottom: 5%;
  left: 5%;
  color: rgba(255, 255, 255, 0.6);
  font-family: var(--font-mono);
  font-size: 0.62rem;
  letter-spacing: 0.1em;
}

.glass-samples {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: var(--space-8);
  padding: var(--space-8) var(--space-6);
}

.glass-sample {
  max-width: 100%;
}

.stage-glass {
  max-width: 100%;
}

.glass-demo {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0 var(--space-5);
  color: #f4f8ff;
  text-align: center;
  text-shadow: 0 1px 12px rgba(2, 6, 16, 0.58);
}

.glass-demo-kicker {
  font-family: var(--font-mono);
  font-size: 0.6rem;
  letter-spacing: 0.14em;
  opacity: 0.78;
}

.glass-demo strong {
  font-family: var(--font-display);
  font-size: 1.3rem;
  font-weight: 750;
  letter-spacing: -0.015em;
}

.glass-demo-chip {
  align-self: center;
  margin-top: 2px;
  padding: 3px 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-full);
  background: rgba(2, 6, 16, 0.22);
  font-family: var(--font-mono);
  font-size: 0.56rem;
  letter-spacing: 0.03em;
  opacity: 0.85;
}

.sample-notes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4);
  margin-top: var(--space-4);
}

.sample-notes article {
  padding: var(--space-5);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: var(--glass-bg);
}

.sample-tag {
  color: var(--fg-2);
  font-family: var(--font-mono);
  font-size: 0.62rem;
  letter-spacing: 0.1em;
}

.sample-notes h3 {
  margin: var(--space-2) 0 0;
  color: var(--fg-0);
  font-size: 1rem;
  font-weight: 700;
}

.sample-notes p {
  margin: var(--space-2) 0 0;
  color: var(--fg-2);
  font-size: 0.82rem;
  line-height: 1.8;
}

/* ---- 03 Hero Tag ---- */
.tag-stage {
  position: relative;
  display: flex;
  min-height: 330px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-lg);
  background: var(--bg-0);
  isolation: isolate;
}

.tag-scene {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(60% 90% at 16% 18%, rgba(139, 123, 255, 0.38), transparent 64%),
    radial-gradient(52% 82% at 84% 22%, rgba(56, 224, 255, 0.3), transparent 62%),
    radial-gradient(76% 100% at 56% 100%, rgba(79, 140, 255, 0.34), transparent 66%),
    linear-gradient(118deg, #071022 4%, #12254a 42%, #24123a 72%, #071022 100%);
}

.tag-scene::before {
  content: '';
  position: absolute;
  inset: -20%;
  background-image:
    linear-gradient(to right, rgba(255, 255, 255, 0.14) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.14) 1px, transparent 1px);
  background-size: 52px 52px;
  opacity: 0.3;
  transform: rotate(-8deg);
}

.tag-demo {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding: var(--space-8) var(--space-5);
  text-align: center;
}

.tag-demo-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0 10px;
  margin: 0;
  color: #f4f8ff;
  font-family: var(--font-display);
  font-size: clamp(1.5rem, 4.2vw, 2.6rem);
  line-height: 1.15;
  text-shadow: rgba(2, 6, 16, 0.55) 0 0 0.18em;
}

.tag-demo-line strong {
  font-weight: 800;
  letter-spacing: -0.02em;
}

.tag-demo-former {
  color: rgba(244, 248, 255, 0.6);
  font-size: 0.5em;
  font-weight: 400;
  letter-spacing: 0;
}

.tag-demo-ft {
  font-size: 0.64em;
}

.tag-demo-current {
  margin: 0;
  color: rgba(244, 248, 255, 0.62);
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.04em;
}

.tag-demo-current strong {
  color: #f4f8ff;
  font-weight: 650;
}

.tag-notes,
.blur-notes {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-3);
  margin-top: var(--space-4);
}

.tag-notes article,
.blur-notes article {
  padding: var(--space-5);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: var(--glass-bg);
}

.tag-notes h3,
.blur-notes h3 {
  margin: var(--space-2) 0 0;
  color: var(--fg-0);
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.5;
}

.tag-notes p,
.blur-notes p {
  margin: var(--space-2) 0 0;
  color: var(--fg-2);
  font-size: 0.8rem;
  line-height: 1.8;
}

.lab-console.tag-console {
  margin-top: var(--space-4);
}

.tag-controls {
  align-items: start;
}

.console-badge {
  padding: 4px 10px;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-full);
  color: var(--fg-2);
  font-family: var(--font-mono);
  font-size: 0.6rem;
  letter-spacing: 0.03em;
  white-space: nowrap;
}

.control--toggle input[type='checkbox'] {
  width: 18px;
  height: 18px;
  margin: 2px 0 0;
  accent-color: var(--accent);
  cursor: pointer;
}

.control input[type='range']:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* ---- 04 Gradual Blur ---- */
.blur-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(280px, 0.7fr);
  gap: var(--space-4);
  align-items: start;
}

.blur-stage {
  position: relative;
  height: clamp(330px, 40vw, 430px);
  overflow: hidden;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-lg);
  background: var(--bg-0);
  isolation: isolate;
}

.blur-scene {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(70% 90% at 14% 10%, rgba(139, 123, 255, 0.4), transparent 64%),
    radial-gradient(54% 76% at 88% 24%, rgba(56, 224, 255, 0.28), transparent 60%),
    radial-gradient(80% 100% at 50% 100%, rgba(79, 140, 255, 0.34), transparent 66%),
    linear-gradient(118deg, #071022 4%, #12254a 44%, #1a1232 74%, #071022 100%);
}

.blur-feed {
  position: relative;
  z-index: 1;
  height: 100%;
  padding: 26px 24px 72px;
  overflow-y: auto;
  scrollbar-color: rgba(255, 255, 255, 0.25) transparent;
  scrollbar-width: thin;
}

.blur-feed-head {
  margin: 0 0 14px;
  color: rgba(244, 248, 255, 0.5);
  font-family: var(--font-mono);
  font-size: 0.6rem;
  letter-spacing: 0.12em;
}

.blur-line {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 4px 12px;
  align-items: baseline;
  margin: 0;
  padding: 10px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  color: #eaf1ff;
}

.blur-line > span {
  grid-row: 1 / 3;
  color: rgba(234, 241, 255, 0.45);
  font-family: var(--font-mono);
  font-size: 0.6rem;
  font-variant-numeric: tabular-nums;
}

.blur-line strong {
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1.5;
}

.blur-line small {
  color: rgba(234, 241, 255, 0.52);
  font-size: 0.68rem;
  line-height: 1.6;
}

.lab-console.blur-console {
  margin-top: 0;
}

.blur-console .console-head {
  padding: var(--space-4);
}

.blur-console-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-4);
}

.segmented {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 3px;
  padding: 3px;
  border: 1px solid var(--line);
  border-radius: var(--radius-full);
  background: var(--bg-0);
}

.seg-btn {
  padding: 6px 4px;
  border: 0;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--fg-2);
  font: inherit;
  font-size: 0.68rem;
  cursor: pointer;
  transition:
    background-color var(--dur-fast) ease-out,
    color var(--dur-fast) ease-out;
}

.seg-btn:hover {
  color: var(--fg-0);
}

.seg-btn.is-active {
  background: var(--accent-dim);
  color: var(--accent-strong);
}

.learning-source {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 18px;
  margin-top: var(--space-4);
  padding: 12px 16px;
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--bg-2) 60%, transparent);
  color: var(--fg-2);
  font-size: 0.72rem;
}

.learning-source > span:first-child {
  color: var(--fg-2);
  font-family: var(--font-mono);
  font-size: 0.56rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.learning-source a {
  color: var(--accent-text);
  text-decoration: none;
}

.learning-source a:hover {
  text-decoration: underline;
}

/* ---- 调参台 ---- */
.lab-console {
  margin-top: var(--space-6);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--accent) 5%, transparent), transparent 42%),
    var(--bg-2);
  box-shadow: var(--shadow-1), var(--glass-insets);
}

.console-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-5);
  border-bottom: 1px solid var(--line);
}

.console-kicker {
  margin: 0 0 var(--space-2);
  color: var(--fg-2);
  font-family: var(--font-mono);
  font-size: 0.6rem;
  letter-spacing: 0.12em;
}

.console-head h3 {
  margin: 0;
  color: var(--fg-0);
  font-size: 1.25rem;
  font-weight: 700;
}

.preset-group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.preset-btn {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 12px;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--fg-1);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color var(--dur-fast) ease-out,
    background-color var(--dur-fast) ease-out,
    color var(--dur-fast) ease-out;
}

.preset-btn strong {
  font-size: 0.78rem;
  font-weight: 650;
}

.preset-btn small {
  color: var(--fg-2);
  font-family: var(--font-mono);
  font-size: 0.58rem;
  letter-spacing: 0.02em;
}

.preset-btn:hover {
  border-color: var(--accent-line);
  color: var(--fg-0);
}

.preset-btn.is-active {
  border-color: var(--accent);
  background: var(--accent-dim);
  color: var(--accent-strong);
}

.preset-btn.is-active small {
  color: var(--accent-text);
}

.console-controls {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-5) var(--space-6);
  padding: var(--space-5);
}

.control {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 8px;
}

.control-line {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
  color: var(--fg-1);
  font-size: 0.78rem;
}

.control-line output {
  color: var(--accent-strong);
  font-family: var(--font-mono);
  font-size: 0.68rem;
  font-variant-numeric: tabular-nums;
}

.control input[type='range'] {
  width: 100%;
  accent-color: var(--accent);
  cursor: pointer;
}

.console-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  border-top: 1px solid var(--line);
  color: var(--fg-2);
  font-family: var(--font-mono);
  font-size: 0.68rem;
}

.ghost-btn {
  padding: 6px 12px;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--fg-1);
  font: inherit;
  font-size: 0.72rem;
  cursor: pointer;
  transition:
    border-color var(--dur-fast) ease-out,
    color var(--dur-fast) ease-out,
    background-color var(--dur-fast) ease-out;
}

.ghost-btn:hover {
  border-color: var(--accent-line);
  background: var(--accent-dim);
  color: var(--accent-strong);
}

/* ---- 管线 ---- */
.pipeline-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-3);
}

.pipeline-card {
  padding: var(--space-5);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: var(--glass-bg);
}

.pipeline-card > span {
  color: var(--accent-text);
  font-family: var(--font-mono);
  font-size: 0.64rem;
  letter-spacing: 0.08em;
}

.pipeline-card h3 {
  margin: var(--space-3) 0 0;
  color: var(--fg-0);
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.45;
}

.pipeline-card p {
  margin: var(--space-2) 0 0;
  color: var(--fg-2);
  font-size: 0.8rem;
  line-height: 1.78;
}

/* ---- 贴图分辨率除数 ---- */
.perf-panel {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(280px, 0.75fr);
  gap: var(--space-6);
  align-items: stretch;
  margin-top: var(--space-5);
  padding: var(--space-5);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--accent) 6%, transparent), transparent 46%),
    var(--bg-2);
  box-shadow: var(--shadow-1), var(--glass-insets);
}

.perf-copy h3 {
  margin: 0 0 var(--space-3);
  color: var(--fg-0);
  font-size: 1.18rem;
  font-weight: 720;
  letter-spacing: -0.015em;
  line-height: 1.4;
}

.perf-copy > p {
  margin: 0;
  color: var(--fg-2);
  font-size: 0.82rem;
  line-height: 1.82;
}

.perf-copy code {
  color: var(--fg-0);
  font-size: 0.96em;
}

.perf-list {
  margin: var(--space-4) 0 0;
  padding-left: 1.2em;
  color: var(--fg-2);
  font-size: 0.8rem;
  line-height: 1.78;
}

.perf-list li + li {
  margin-top: 5px;
}

.perf-list strong {
  color: var(--accent-strong);
  font-family: var(--font-mono);
  font-size: 0.95em;
}

.perf-live {
  margin-top: var(--space-4) !important;
  padding-top: var(--space-3);
  border-top: 1px solid var(--line);
  color: var(--fg-1) !important;
  font-family: var(--font-mono);
  font-size: 0.7rem !important;
  letter-spacing: 0.01em;
}

.perf-live strong {
  color: var(--accent-strong);
  font-weight: 650;
}

.perf-diagram {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--bg-0) 45%, transparent);
}

.perf-scale {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  gap: var(--space-3);
  align-items: center;
  color: var(--fg-2);
  font-family: var(--font-mono);
  font-size: 0.66rem;
}

.perf-scale-label {
  color: var(--fg-1);
  font-weight: 600;
}

.perf-scale.is-current .perf-scale-label {
  color: var(--accent-strong);
}

.perf-bar {
  display: block;
  height: 7px;
  overflow: hidden;
  border-radius: var(--radius-full);
  background: var(--tab-hover);
}

.perf-bar i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--accent);
  transition: width var(--dur-base) var(--ease-out-quart);
}

.perf-scale.is-current .perf-bar i {
  background: var(--accent-2);
}

.perf-scale-value {
  color: var(--fg-1);
  text-align: right;
  white-space: nowrap;
}

.perf-scale-value small {
  display: block;
  margin-top: 1px;
  color: var(--fg-2);
  font-size: 0.92em;
}

.perf-foot {
  margin: 2px 0 0;
  color: var(--fg-2);
  font-family: var(--font-mono);
  font-size: 0.56rem;
  letter-spacing: 0.03em;
  text-align: right;
}

.snippet-block {
  margin-top: var(--space-5);
  overflow: hidden;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-md);
  background: var(--bg-0);
}

.snippet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: 10px var(--space-4);
  border-bottom: 1px solid var(--line);
  color: var(--fg-2);
  font-family: var(--font-mono);
  font-size: 0.64rem;
  letter-spacing: 0.06em;
}

.snippet-code {
  max-height: 420px;
  margin: 0;
  padding: var(--space-5);
  overflow: auto;
  color: var(--fg-1);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  line-height: 1.75;
  white-space: pre;
  tab-size: 2;
}

/* ---- 差异表 ---- */
.difference-wrap {
  margin-top: var(--space-5);
  overflow-x: auto;
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
}

.difference-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 760px;
  font-size: 0.8rem;
}

.difference-table caption {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--line);
  color: var(--fg-2);
  font-family: var(--font-mono);
  font-size: 0.64rem;
  letter-spacing: 0.08em;
  text-align: left;
}

.difference-table th,
.difference-table td {
  padding: 12px var(--space-4);
  border-bottom: 1px solid var(--line);
  text-align: left;
  vertical-align: top;
  line-height: 1.7;
}

.difference-table thead th {
  color: var(--fg-2);
  font-family: var(--font-mono);
  font-size: 0.64rem;
  font-weight: 600;
  letter-spacing: 0.06em;
}

.difference-table tbody th {
  width: 14%;
  color: var(--fg-0);
  font-weight: 650;
  white-space: nowrap;
}

.difference-table td {
  width: 43%;
  color: var(--fg-1);
}

.difference-table tbody tr:last-child th,
.difference-table tbody tr:last-child td {
  border-bottom: 0;
}

/* ---- 源码 ---- */
.source-panel {
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--bg-2);
  box-shadow: var(--shadow-1), var(--glass-insets);
  overflow: hidden;
}

.source-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--line);
}

.source-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.source-tab {
  padding: 7px 12px;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--fg-2);
  font: inherit;
  font-size: 0.72rem;
  cursor: pointer;
  transition:
    border-color var(--dur-fast) ease-out,
    background-color var(--dur-fast) ease-out,
    color var(--dur-fast) ease-out;
}

.source-tab:hover {
  border-color: var(--accent-line);
  color: var(--fg-0);
}

.source-tab.is-active {
  border-color: var(--accent);
  background: var(--accent-dim);
  color: var(--accent-strong);
}

.source-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
}

.source-actions a {
  color: var(--accent-text);
  font-size: 0.72rem;
}

.source-path {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  margin: 0;
  padding: 10px var(--space-5);
  border-bottom: 1px solid var(--line);
  color: var(--fg-2);
  font-size: 0.68rem;
}

.source-path code {
  color: var(--fg-1);
}

.source-details summary {
  padding: 12px var(--space-5);
  color: var(--fg-1);
  font-size: 0.78rem;
  cursor: pointer;
  transition: color var(--dur-fast) ease-out;
}

.source-details summary:hover {
  color: var(--accent-strong);
}

.source-code {
  max-height: 560px;
  margin: 0;
  padding: var(--space-5);
  overflow: auto;
  border-top: 1px solid var(--line);
  background: var(--bg-0);
  color: var(--fg-1);
  font-family: var(--font-mono);
  font-size: 0.72rem;
  line-height: 1.7;
  white-space: pre;
  tab-size: 2;
}

/* ---- 页脚 ---- */
.lab-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
  padding-top: var(--space-6);
  color: var(--fg-2);
  font-size: 0.76rem;
  line-height: 1.8;
}

.lab-foot p {
  max-width: 62em;
  margin: 0;
}

.lab-foot a {
  color: var(--accent-text);
}

@media (max-width: 980px) {
  .lab-hero {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-5);
    align-items: start;
  }

  /* 单列后目录卡已经承担导航，右侧目录不再重复占一屏 */
  .lab-hero-aside {
    display: none;
  }

  .pipeline-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .console-controls {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .perf-panel,
  .blur-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .tag-notes,
  .blur-notes {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .glass-stage {
    min-height: 620px;
  }

  .glass-samples {
    flex-direction: column;
    gap: var(--space-5);
    padding: var(--space-6) var(--space-4);
  }

  .sample-notes {
    grid-template-columns: minmax(0, 1fr);
  }

  .console-controls {
    grid-template-columns: minmax(0, 1fr);
  }

  .console-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .tag-notes,
  .blur-notes {
    grid-template-columns: minmax(0, 1fr);
  }

  .tag-stage {
    min-height: 380px;
  }

  .tag-demo {
    padding: var(--space-6) var(--space-4);
  }

  .blur-stage {
    height: 360px;
  }
}

@media (max-width: 560px) {
  .glass-stage {
    min-height: 560px;
  }

  .pipeline-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .section-title h2 {
    font-size: 1.45rem;
  }

  .lab-hero h1 {
    font-size: clamp(2.5rem, 13vw, 3.4rem);
  }

  .lab-hero-meta {
    gap: 6px;
  }

  .source-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .catalog-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .tag-demo-line {
    font-size: 1.45rem;
  }

  .tag-demo-current {
    font-size: 0.62rem;
  }

  .perf-diagram {
    padding: 12px;
  }

  .perf-scale {
    grid-template-columns: 30px minmax(0, 1fr) auto;
    gap: 8px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .aside-link,
  .catalog-card,
  .perf-bar i,
  .preset-btn,
  .ghost-btn,
  .seg-btn,
  .source-tab,
  .source-details summary {
    transition: none;
  }

  .catalog-card:hover {
    transform: none;
  }
}
</style>
