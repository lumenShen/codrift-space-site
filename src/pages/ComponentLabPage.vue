<script setup lang="ts">
/*
 * 前端组件实验室（/lab）
 *
 * 第一组实验：把 Codrift 与 Rein 的液态玻璃并排放在同一块场景上。
 *   - 左：src/effects/GlassSurface.vue（Codrift 单文件版，表面 + 滤镜定义合一）；
 *   - 右：./rein-glass/ReinGlassSurface.vue + ReinGlassFilter.vue（Rein 拆分版复刻）。
 *
 * 两块玻璃吃同一组材质参数（调参台实时改），因此同参数下的差异只剩「封装」本身；
 * 点「Codrift 默认 / Rein 默认」又能切换回两种产品各自的出厂取向。底部源码面板
 * 通过 Vite 的 ?raw 直接读组件源文件，复制按钮给出的就是站内正在跑的代码。
 *
 * 实验室只做展示，不改变站内 GlassSurface / GlassButton 的契约默认值。
 */
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { GlassSurface } from '@/effects';
import ReinGlassSurface from '@/components/lab/rein-glass/ReinGlassSurface.vue';
import {
  CODRAFT_GLASS,
  GLASS_PRESETS,
  REIN_GLASS,
  type GlassMaterial,
} from '@/components/lab/glass-material';
import codriftSource from '@/effects/GlassSurface.vue?raw';
import reinSurfaceSource from '@/components/lab/rein-glass/ReinGlassSurface.vue?raw';
import reinFilterSource from '@/components/lab/rein-glass/ReinGlassFilter.vue?raw';

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
];

const activeSourceId = ref(sourceTabs[0].id);
const activeSource = computed(
  () => sourceTabs.find((tab) => tab.id === activeSourceId.value) ?? sourceTabs[0],
);
const sourceLineCount = computed(() => activeSource.value.code.split('\n').length);

const coreSnippet = `<!-- 1. 位移贴图：红 / 蓝两个通道的渐变决定边缘往哪边扯 -->
<rect width="100%" height="100%" fill="url(#red-grad)" />
<rect width="100%" height="100%" fill="url(#blue-grad)" />
<rect x="edge" y="edge" width="w - 2 * edge" height="h - 2 * edge"
      rx="radius" fill="hsl(0 0% 50% / .95)"
      style="filter:blur(6px)" />

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
    codrift: '44px 胶囊按钮到整块面板；mapScale 4 先省一半贴图成本。',
    rein: '54–58px 的 UI 表面（Dock / 悬浮条）；mapScale 1 按元素像素烘，边缘更准。',
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
          这里不放截图，放能摸的实现。第一组实验把 Codrift 与 Rein 的液态玻璃并排放到同一块场景上：
          同一套折射管线、两组出厂材质、九个可调参数，源码直接摊开。
        </p>
        <div class="lab-hero-meta">
          <span>2 套实现</span>
          <span>9 个参数</span>
          <span :data-status="refractionStatus">
            {{ refractionStatus === 'refracting' ? '当前：完整折射' : '当前：毛玻璃退化' }}
          </span>
        </div>
      </div>

      <aside class="lab-hero-aside" aria-label="实验目录">
        <p class="aside-kicker">ON THIS BENCH</p>
        <button type="button" class="aside-link" @click="scrollToSection('glass')">
          <span>01</span>液态玻璃
        </button>
        <button type="button" class="aside-link" @click="scrollToSection('pipeline')">
          <span>02</span>折射管线
        </button>
        <button type="button" class="aside-link" @click="scrollToSection('source')">
          <span>03</span>源码
        </button>
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
          <p class="section-kicker">PIPELINE / FOUR STEPS</p>
          <h2>折射是怎么画出来的</h2>
          <p>
            不是贴一张玻璃的 PNG，也不是简单的模糊。四步之后，玻璃背后的文字、色块、
            滚动内容都会跟着边缘一起弯。
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

    <section id="source" class="lab-section">
      <header class="lab-section-head">
        <span class="section-no">03</span>
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
        两套实现都源自 vue-bits 的 GlassSurface（MIT）。Rein 版在实验室内做了复刻：
        原文件见
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
  align-items: end;
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

.aside-link {
  display: flex;
  width: 100%;
  align-items: center;
  gap: var(--space-3);
  padding: 9px 0;
  border: 0;
  border-top: 1px solid var(--line);
  background: transparent;
  color: var(--fg-1);
  font: inherit;
  font-size: 0.88rem;
  text-align: left;
  cursor: pointer;
  transition: color var(--dur-fast) ease-out;
}

.aside-link:hover {
  color: var(--accent-strong);
}

.aside-link span {
  color: var(--fg-2);
  font-family: var(--font-mono);
  font-size: 0.66rem;
  font-variant-numeric: tabular-nums;
}

.aside-note {
  margin: var(--space-4) 0 0;
  padding-top: var(--space-4);
  border-top: 1px solid var(--line);
  color: var(--fg-2);
  font-size: 0.72rem;
  line-height: 1.75;
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

  .lab-hero-aside {
    max-width: 520px;
  }

  .pipeline-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .console-controls {
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
}

@media (prefers-reduced-motion: reduce) {
  .aside-link,
  .preset-btn,
  .ghost-btn,
  .source-tab,
  .source-details summary {
    transition: none;
  }
}
</style>
