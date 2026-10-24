<script setup lang="ts">
/*
 * HomePage —— 首页：大字重 hero 双栏 + 全展开板块。
 * hero 双栏构图（站长批注，优先级高于 DESIGN-V2 hero 章节）：
 *   左栏 = 巨型 Codrift（≤6rem、Archivo 800）+ 身份行 + 口号 + 四枚胶囊 CTA；
 *   右栏 = FeatureStack 层叠卡（紧凑 380~440 宽 × 420~480 高，与左栏顶对齐）；
 *   移动端（<768px）上下堆叠，卡叠限宽居中于文字下方。
 * 身份行定稿「LumenShen（旧名 gozaoo）」：站长划掉「这是」与「的主页」，
 * 只留名字本身，旧名以次级文本弱化，不喧宾；口号「漂流至此」用点题橙。
 * 本期拆除折叠系统（站长指示：全部板块直接展开），
 * CollapsibleSection 组件与「全部展开/收起」控制已移除。
 * 板块正文全部经内容系统渲染（tag 'home' 的条目，见 components/content.ts）；
 * 作品集是调研定稿的结构化数据（卡片渲染），博客速览取内容系统最新文章。
 * 特色轮播 FeatureStack 改造自 vue-bits Stack（上游存档 research/vue-bits/Stack.vue）。
 */
import { computed, nextTick } from 'vue';
import PortfolioCard from '@/components/PortfolioCard.vue';
import BlogCard from '@/components/BlogCard.vue';
import FeatureStack from '@/components/hero/FeatureStack.vue';
import { GlassButton } from '@/effects';
import {
  ensureExtendComponentsRegistered,
  renderedEntry,
  selectHomeSections,
  selectLatestPosts,
  type HomeSection,
} from '@/components/content';

ensureExtendComponentsRegistered();

/* 作品集数据（GitHub 调研定稿，简介如实保留；BlurLyric 卡片站长确认保留） */
interface Repo {
  name: string;
  url: string;
  description: string;
  language?: string;
  stars?: number;
  flagship?: boolean;
  internal?: boolean;
  badge?: string;
  highlight?: string;
  featured?: boolean;
}

const repos: Repo[] = [
  {
    name: 'Rein',
    url: 'https://github.com/lumenShen/Rein',
    description:
      '【旗舰】以 AI 为中枢的个人生活助理（桌面+安卓）：饮食、运动、待办、记账、课表、知识库整合在同一条时间线上，AI 可在对话中直接调用工具写数据（记一餐、记账、排日程）并沉淀为卡片；本地优先、数据留本地，支持端到端加密多设备同步与 Ed25519 验签自动更新。技术栈 Tauri 2 + Vue 3 + Rust + SQLite，界面为 Apple Liquid Glass 式玻璃质感（依据仓库 README）',
    language: 'Vue',
    stars: 0,
    flagship: true,
  },
  {
    name: '开源知识笔记库',
    url: '/notes',
    description:
      '三类开源知识笔记：同济《高等数学》第八版上册正课版（7 章 / 17 单元 / 144 节 / 216 例题 / 464 页 PDF）、与其逐章对应的复习版（143 节 / 102 页 PDF），以及从编译器、内存与链接视角重学的 C 语言工程笔记（8 章 / 20 单元 / 17.7 万汉字）。三种笔记均可在站内全屏阅读，高数两套另可下载 PDF 与单文件 HTML',
    language: 'Markdown',
    internal: true,
    featured: true,
    badge: '开源笔记 · 3 种',
    highlight: 'AI驱动的知识笔记再优化，让晦涩难懂的语言更加易懂',
  },
  {
    name: 'BlurLyric',
    url: 'https://github.com/Project-And-Factory/BlurLyric',
    description:
      '高颜值、高性能的网易云音乐第三方播放器（Electron + Vue 3，自研歌词滚动算法、几乎零延迟，响应式布局）。注意：lumenShen 名下无此仓库（API 404，其 7 个公开仓库中亦无），项目实际位于 Project-And-Factory 组织且已归档（2023-08 最后 push）；组织公开成员仅 g2nnyS、sider2vf，与 lumenShen 的归属关系无法核实。GitHub 搜索另见 gozaoo 账号下续作 BlurLyric-3.0（Vue，3★）与 BlurLyric_Old（2★）',
    language: 'JavaScript',
    stars: 79,
    flagship: false,
  },
  {
    name: 'EffiBuddy',
    url: 'https://github.com/lumenShen/EffiBuddy',
    description:
      '本地优先的 AI Agent 桌面应用（EffiSuite）：35+ 工具集（文件读写、Shell、Web 搜索、代码库检索、子 Agent 委派等）、BM25+向量混合 RAG 记忆、技能市场、语音转写、局域网 P2P 端到端加密多设备协作；Tauri 2 + Vue 3 + Rust（rig 框架，MIT，v0.1.0 早期开发中）（依据仓库 README）',
    language: 'Rust',
    stars: 1,
    flagship: false,
  },
  {
    name: 'Chordial',
    url: 'https://github.com/lumenShen/Chordial',
    description:
      '基于 Tauri 2 + Vue 3 + TypeScript 的桌面应用仓库（近期活跃、有 1 star）；README 仍为脚手架默认模板文本，具体功能简介待补充',
    language: 'Vue',
    stars: 1,
    flagship: false,
  },
  {
    name: 'Rein-hub',
    url: 'https://github.com/lumenShen/Rein-hub',
    description: 'Rein 程序的发布和问题讨论仓库（API description 原文）',
    stars: 0,
    flagship: false,
  },
];

/* 内容系统板块（tag 'home'）：about → contact → 其余板块（skills/now 等），
   全部直接展开（本期拆除折叠系统） */
const contentSections = computed<HomeSection[]>(() => selectHomeSections());

/* hero 的「作品集」胶囊：平滑滚到板块（reduced-motion 直接跳） */
function scrollToPortfolio(): void {
  void nextTick(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById('portfolio')?.scrollIntoView({
      behavior: reduce ? 'auto' : 'smooth',
      block: 'start',
    });
  });
}

/* 博客速览：内容系统最新 3 篇 */
const latestPosts = selectLatestPosts(3);
</script>

<template>
  <main class="page-home">
    <section class="hero">
      <div class="hero-inner">
        <div class="hero-copy">
          <h1 class="hero-title">Codrift</h1>
          <p class="hero-identity">
            <strong class="hero-identity-name">LumenShen</strong><span class="hero-identity-former">（旧名 gozaoo）</span>
          </p>
          <p class="hero-slogan">代码与想法，<span class="hero-slogan-hl">漂流至此</span>。</p>

          <div class="hero-actions">
            <GlassButton class="hero-pill hero-pill--primary" size="lg" href="#/blog">
              <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
                <path
                  d="M5 12h14m-6-6 6 6-6 6"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              看看博客
            </GlassButton>
            <GlassButton class="hero-pill" size="lg" href="https://github.com/lumenShen/">
              <svg viewBox="0 0 16 16" width="17" height="17" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
                />
              </svg>
              GitHub
            </GlassButton>
            <GlassButton class="hero-pill" size="lg" @click="scrollToPortfolio">
              <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
                <path
                  d="M4 5h7v7H4zM13 5h7v4h-7zM13 12h7v7h-7zM4 15h7v4H4z"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.7"
                  stroke-linejoin="round"
                />
              </svg>
              作品集
            </GlassButton>
            <GlassButton class="hero-pill" size="lg" href="mailto:gozaoo@outlook.com">
              <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
                <path
                  d="M3 5h18v14H3z"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linejoin="round"
                />
                <path
                  d="m3 7 9 6 9-6"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              联系我
            </GlassButton>
          </div>
        </div>

        <div class="hero-feature">
          <FeatureStack />
        </div>
      </div>
    </section>

    <div class="sections">
      <section
        v-for="s in contentSections"
        :key="s.id"
        class="panel"
        :aria-labelledby="`${s.id}-title`"
      >
        <header class="panel-head">
          <h2 :id="`${s.id}-title`" class="panel-title">{{ s.title }}</h2>
        </header>
        <div class="panel-body">
          <component :is="renderedEntry(s.entry)" />
        </div>
      </section>

      <section id="portfolio" class="panel" aria-labelledby="portfolio-title">
        <header class="panel-head">
          <h2 id="portfolio-title" class="panel-title">作品集</h2>
        </header>
        <div class="panel-body">
          <div class="repo-grid">
            <PortfolioCard
              v-for="r in repos"
              :key="r.name"
              :name="r.name"
              :url="r.url"
              :description="r.description"
              :language="r.language"
              :stars="r.stars"
              :flagship="r.flagship"
              :internal="r.internal"
              :badge="r.badge"
              :highlight="r.highlight"
              :featured="r.featured"
            />
          </div>
        </div>
      </section>

      <section class="panel" aria-labelledby="blog-title">
        <header class="panel-head">
          <h2 id="blog-title" class="panel-title">博客速览</h2>
        </header>
        <div class="panel-body">
          <div v-if="latestPosts.length" class="post-grid">
            <BlogCard v-for="p in latestPosts" :key="p.slug" :entry="p" />
          </div>
          <p v-else class="empty-note">博客文章即将上线。</p>
          <RouterLink v-if="latestPosts.length" class="more-link" to="/blog" data-cursor="target">
            全部文章 →
          </RouterLink>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.page-home {
  padding-bottom: var(--space-9);
}

/* ---- hero ----
   巨型站名「坐」在一束环境光里（radial 光斑，不是文字发光）；
   进场是一次编排好的浮现（0.7s + 0.08s 阶梯），之后交给极光漂移与指针动效。 */
.hero {
  position: relative;
  padding: var(--space-9) 0 var(--space-8);
  text-align: center;
}

.hero::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 44%;
  width: min(720px, 92vw);
  aspect-ratio: 2 / 1;
  transform: translate(-50%, -50%);
  /* 光斑色取自主色令牌（color-mix），随主题换肤 */
  background: radial-gradient(
    ellipse at center,
    color-mix(in srgb, var(--accent) 20%, transparent),
    transparent 68%
  );
  filter: blur(10px);
  pointer-events: none;
}

.hero-title {
  position: relative;
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(3.4rem, 13vw, 6rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.04;
  color: var(--fg-0);
  animation: hero-in 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.hero-identity {
  position: relative;
  margin: var(--space-3) 0 0;
  color: var(--fg-1);
  font-size: clamp(1rem, 2.2vw, 1.15rem);
  font-weight: 500;
  letter-spacing: 0.01em;
  animation: hero-in 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.08s both;
}

.hero-identity-name {
  color: var(--fg-0);
  font-weight: 700;
}

/* 旧名：次级文本弱化呈现，不喧宾 */
.hero-identity-former {
  color: var(--fg-2);
  font-size: 0.85em;
  font-weight: 400;
}

.hero-slogan {
  position: relative;
  margin: var(--space-4) 0 0;
  color: var(--fg-1);
  font-size: clamp(1.05rem, 2.6vw, 1.4rem);
  font-weight: 500;
  letter-spacing: 0.01em;
  animation: hero-in 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.16s both;
}

.hero-slogan-hl {
  /* 口号关键词：点题橙的文字安全档（亮色下 --accent-2 直接作字不达 AA，§3.6-A） */
  color: var(--accent-2-text, var(--accent-2));
  font-weight: 650;
}

.hero-actions {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: var(--space-4);
  margin-top: var(--space-7);
  animation: hero-in 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.24s both;
}

.hero-feature {
  position: relative;
  display: flex;
  justify-content: center;
  margin-top: var(--space-8);
  animation: hero-in 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.32s both;
}

/* 玻璃胶囊的边缘光：经 CSS 变量传给 GlassSurface 的 border（不硬掰它的样式） */
.hero-pill {
  --glass-border: var(--accent-line);
}

.hero-pill--primary {
  --glass-border: var(--accent);
}

@keyframes hero-in {
  from {
    opacity: 0;
    transform: translateY(14px);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

/* ---- 板块（全部直接展开）----
   外壳沿用原折叠板的形态：1px --line + radius-lg + 玻璃底 + 光学内层（§4.1），
   头行保持 56px 条形（14px 上下 + 24px 左右），头行与正文之间 1px 分隔线。 */
.sections {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.panel {
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--glass-bg);
  box-shadow: var(--shadow-1), var(--glass-insets);
  transition: border-color 0.2s ease-out;
}

.panel:hover {
  border-color: var(--line-strong);
}

.panel-head {
  padding: 14px var(--space-5);
  border-bottom: 1px solid var(--line);
}

.panel-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--fg-0);
}

.panel-body {
  padding: var(--space-5);
  color: var(--fg-1);
  font-size: 0.95rem;
}

/* 渲染出来的正文（内容系统组件）内部排版微调 */
.panel-body > :deep(*:first-child) {
  margin-top: 0;
}

.panel-body > :deep(*:last-child) {
  margin-bottom: 0;
}

.panel-body :deep(a) {
  text-decoration: underline;
  text-underline-offset: 3px;
}

/* hero「作品集」胶囊的滚动落点：给悬浮页头留出空间 */
#portfolio {
  scroll-margin-top: 6rem;
}

.repo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--space-4);
}

.post-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--space-4);
}

.more-link {
  display: inline-block;
  margin-top: var(--space-4);
  /* 小号主色文字：墨水用途取 --accent-text（亮色 #2b66d9，4.88:1） */
  color: var(--accent-text, var(--accent));
  font-size: 0.92rem;
}

.empty-note {
  margin: 0;
  color: var(--fg-2);
}

@media (max-width: 640px) {
  .hero {
    padding: var(--space-7) 0 var(--space-7);
  }

  .hero-actions {
    gap: var(--space-3);
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-title,
  .hero-identity,
  .hero-slogan,
  .hero-actions,
  .hero-feature {
    animation: none;
  }

  .panel {
    transition: none;
  }
}
</style>
