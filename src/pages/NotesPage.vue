<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import NotesReader from '@/components/NotesReader.vue';
import {
  noteDownloadName,
  noteFileUrl,
  notesCollections,
  notesTotals,
  type NoteCollection,
} from '@/data/notes';

const gaoshu = notesCollections.find((item) => item.id === 'gaoshu')!;

const activeCollectionId = ref(gaoshu.id);
const readerOpen = ref(false);
const initialIndex = ref(0);
const initialAnchor = ref('');

const activeCollection = computed(
  () => notesCollections.find((item) => item.id === activeCollectionId.value) ?? null,
);

const gaoshuReview = notesCollections.find((item) => item.id === 'gaoshu-review')!;

const offlineItems = [
  {
    tag: 'PDF',
    label: '高数正课 · 464 页',
    note: 'A4 · 带页码与页眉',
    collection: gaoshu,
    file: 'notes-vol1.pdf',
  },
  {
    tag: 'PDF',
    label: '高数复习 · 102 页',
    note: 'A4 · 按章速查',
    collection: gaoshuReview,
    file: 'notes-vol1.pdf',
  },
  {
    tag: 'HTML',
    label: '高数正课 · 单文件',
    note: '样式、字体与图像内联',
    collection: gaoshu,
    file: 'book-inline.html',
  },
  {
    tag: 'HTML',
    label: '高数复习 · 单文件',
    note: '样式、字体与图像内联',
    collection: gaoshuReview,
    file: 'book-inline.html',
  },
];

function formatWan(value: number): string {
  return `${(value / 10000).toFixed(1)} 万`;
}

function coverUrl(collection: NoteCollection): string {
  return noteFileUrl(collection, collection.cover);
}

function chapterPreview(collection: NoteCollection): string {
  const names = collection.chapters.slice(0, 3).map((chapter) => chapter.title);
  return `${names.join(' · ')}${collection.chapters.length > 3 ? ' …' : ''}`;
}

function openReader(collection: NoteCollection, index = 0, anchor = ''): void {
  activeCollectionId.value = collection.id;
  initialIndex.value = index;
  initialAnchor.value = anchor;
  readerOpen.value = true;
}

function selectCollection(id: string): void {
  activeCollectionId.value = id;
  initialIndex.value = 0;
  initialAnchor.value = '';
}

function closeReader(): void {
  readerOpen.value = false;
}

function scrollToLibrary(): void {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.getElementById('notes-library')?.scrollIntoView({
    behavior: reduce ? 'auto' : 'smooth',
    block: 'start',
  });
}
</script>

<template>
  <main class="page-notes">
    <RouterLink class="notes-back" to="/blog" data-cursor="target">← 返回博客</RouterLink>

    <header class="notes-hero">
      <div class="hero-copy">
        <p class="notes-eyebrow"><span aria-hidden="true"></span>开源知识笔记 · {{ notesTotals.kinds }} 种</p>
        <h1 class="notes-title">知识笔记库</h1>
        <p class="notes-sub">高数正课 / 高数复习 / C 语言工程 · 在站内全屏翻开</p>

        <p class="notes-highlight">
          <span class="hl-ai">AI</span>驱动的知识笔记再优化，<br />
          让晦涩难懂的语言<span class="hl-key">更加易懂</span>。
        </p>

        <p class="notes-lede">
          三种笔记来自同一套 Markdown 写作流水线：模型先把晦涩的教材语言重写成人话，
          再由复核与机械验算把结论钉住。选一种，直接在站内翻开——没有跳转，没有另一套网页界面。
        </p>

        <div class="hero-actions">
          <button type="button" class="notes-cta" data-cursor="target" @click="openReader(gaoshu)">
            打开正课版
            <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
              <path
                d="M3 8h9.2M8.6 4.4 12.2 8l-3.6 3.6"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <button type="button" class="notes-ghost" data-cursor="target" @click="scrollToLibrary">
            先看三种笔记
          </button>
        </div>

        <dl class="notes-stats">
          <div>
            <dt>{{ notesTotals.kinds }}</dt>
            <dd>种笔记</dd>
          </div>
          <div>
            <dt>{{ notesTotals.units }}</dt>
            <dd>个单元</dd>
          </div>
          <div>
            <dt>{{ formatWan(notesTotals.chars) }}</dt>
            <dd>正文汉字</dd>
          </div>
          <div>
            <dt>{{ notesTotals.pages }}</dt>
            <dd>页 PDF</dd>
          </div>
        </dl>

        <p class="notes-total-line">
          {{ notesTotals.chapters }} 章 · {{ notesTotals.examples }} 道例题 · {{ notesTotals.graphs }} 幅函数图像
        </p>
      </div>

      <div class="cover-shelf" aria-label="三种笔记的封面">
        <button
          v-for="(item, index) in notesCollections"
          :key="item.id"
          type="button"
          class="cover-tile"
          :class="`cover-tile--${index + 1}`"
          data-cursor="target"
          @click="openReader(item)"
        >
          <span class="cover-image">
            <img
              :src="coverUrl(item)"
              :alt="item.coverAlt"
              :loading="index === 0 ? 'eager' : 'lazy'"
              decoding="async"
            />
          </span>
          <span class="cover-meta">
            <span class="cover-kind">{{ item.kind }}</span>
            <strong>{{ item.shortTitle }}</strong>
            <span class="cover-cta">阅读 →</span>
          </span>
        </button>
      </div>
    </header>

    <section id="notes-library" class="notes-library" aria-labelledby="library-title">
      <div class="section-head">
        <p class="section-kicker">THE LIBRARY / 03</p>
        <h2 id="library-title">三种笔记，按需翻开</h2>
        <p>
          不是三份重复的教材：正课版负责把每一步讲透，复习版只留概念与做题路径，
          C 语言笔记从编译器、内存与链接的视角讲工程。
        </p>
      </div>

      <div class="library-grid">
        <article
          v-for="(item, index) in notesCollections"
          :key="item.id"
          class="note-card"
          :class="`note-card--${index + 1}`"
        >
          <button
            type="button"
            class="note-preview"
            data-cursor="target"
            :aria-label="`打开${item.title}阅读器`"
            @click="openReader(item)"
          >
            <img :src="coverUrl(item)" :alt="item.coverAlt" loading="lazy" decoding="async" />
            <span class="note-preview-shade"></span>
            <span class="note-kind">{{ item.kind }}</span>
            <span v-if="item.status" class="note-status">{{ item.status }}</span>
            <span class="note-preview-cta">在站内翻开 <span aria-hidden="true">↗</span></span>
          </button>

          <div class="note-body">
            <p class="note-subject">{{ item.subject }}</p>
            <h3>{{ item.title }}</h3>
            <p class="note-tagline">{{ item.tagline }}</p>
            <p class="note-desc">{{ item.description }}</p>

            <dl class="note-metrics">
              <div v-for="metric in item.metrics" :key="metric.label">
                <dt>{{ metric.value }}</dt>
                <dd>{{ metric.label }}</dd>
              </div>
            </dl>

            <p class="note-chapters">{{ chapterPreview(item) }}</p>

            <div class="note-actions">
              <button type="button" class="note-read" data-cursor="target" @click="openReader(item)">
                开始阅读
                <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                  <path
                    d="M3 8h9.2M8.6 4.4 12.2 8l-3.6 3.6"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.6"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
              <a
                v-for="download in item.downloads"
                :key="download.file"
                class="note-download"
                :href="noteFileUrl(item, download.file)"
                :download="noteDownloadName(download.file)"
                :title="`下载${download.label}`"
                data-cursor="target"
              >
                {{ download.tag }}
              </a>
            </div>
          </div>
        </article>
      </div>
    </section>

    <section class="notes-demo" aria-labelledby="demo-title">
      <div class="section-head">
        <p class="section-kicker">THE DIFFERENCE</p>
        <h2 id="demo-title">同一页，换一种说法</h2>
        <p>定义负责准确，「大白话」负责先把直觉讲通。下面是正课版里真实存在的一组对照。</p>
      </div>

      <div class="demo-pair">
        <article class="demo-card demo-card--textbook">
          <span class="demo-tag">教材式</span>
          <p>
            设 X、Y 是两个非空集合，如果存在一个法则 f，使得对 X 中每个元素 x，按法则 f，在 Y
            中有唯一确定的元素 y 与之对应，那么称 f 为从 X 到 Y 的映射。
          </p>
        </article>

        <span class="demo-arrow" aria-hidden="true">→</span>

        <article class="demo-card demo-card--plain">
          <span class="demo-tag">大白话</span>
          <p>
            把 X 想成一栋宿舍楼里的房间号，把 Y 想成仓库里的床位。映射就是一张分配表：每个房间都得分配到一个床位（不能有房间漏掉），每个房间只能分配一个床位（不能一间房占两张床）。但允许多个房间分到同一个床位——这就是允许「撞车」。
          </p>
        </article>
      </div>

      <div class="demo-foot">
        <p>摘自《高等数学 · 正课》1.1 映射与函数</p>
        <button
          type="button"
          class="demo-link"
          data-cursor="target"
          @click="openReader(gaoshu, 0, 'unit-ch01-01-mapping-functions-sequences')"
        >
          在阅读器里读这一节 →
        </button>
      </div>
    </section>

    <section class="notes-method" aria-labelledby="method-title">
      <div class="section-head">
        <p class="section-kicker">THE PIPELINE</p>
        <h2 id="method-title">AI 驱动，但不是一键生成</h2>
        <p>三套笔记共用一套流程：模型负责把语言变简单，构建与复核负责让结论仍然可靠。</p>
      </div>

      <div class="method-grid">
        <article class="method-step">
          <span>01 / 重写</span>
          <h3>逐节拆成能读的块</h3>
          <p>
            定义、定理、证明、例题各自成块，每节补一段「大白话」：先用生活直觉把概念讲通，再回到严格表述。
          </p>
        </article>
        <article class="method-step">
          <span>02 / 复核</span>
          <h3>公式与代码逐条验算</h3>
          <p>
            高数两版由独立复核员逐条重算，253 条机械验算守住可验证的结论；C 语言笔记把代码清单放进真编译、真运行闸门。
          </p>
        </article>
        <article class="method-step">
          <span>03 / 质检</span>
          <h3>逐页检查版面</h3>
          <p>
            同一份内容渲染成 HTML，再由 headless Chrome 打印为 A4；464 + 102 页逐页检测空白页与公式越界。
          </p>
        </article>
      </div>
    </section>

    <section class="notes-offline" aria-labelledby="offline-title">
      <div class="offline-copy">
        <p class="section-kicker">TAKE IT OFFLINE</p>
        <h2 id="offline-title">高数两套，可以带走</h2>
        <p>
          正课 464 页、复习 102 页，各有一份 A4 PDF 与一份样式、字体、图像全部内联的单文件 HTML；
          C 语言笔记则按 20 个单元在站内阅读。站内读的就是下载的，排版保持原样。
        </p>
      </div>

      <div class="offline-links">
        <a
          v-for="item in offlineItems"
          :key="`${item.collection.id}-${item.file}`"
          class="offline-link"
          :href="noteFileUrl(item.collection, item.file)"
          :download="noteDownloadName(item.file)"
          data-cursor="target"
        >
          <span class="offline-tag">{{ item.tag }}</span>
          <span class="offline-copy-block">
            <strong>{{ item.label }}</strong>
            <small>{{ item.note }}</small>
          </span>
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path
              d="M8 2.6v7.2m0 0L4.9 6.7M8 9.8l3.1-3.1M3.2 12.6h9.6"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </a>
      </div>
    </section>

    <p class="notes-source">
      三套笔记都以 Markdown 维护，经 markdown-it + KaTeX 服务端渲染为 HTML，再由 headless Chrome
      打印为 PDF。站内阅读器只负责把同一份纸面内容装进深色阅读面板：隐藏原来的站内导航、注入深色版式，
      正文、公式与锚点保持原样。
    </p>

    <footer class="notes-end">
      <RouterLink class="notes-back notes-back--bottom" to="/blog" data-cursor="target">← 返回博客</RouterLink>
      <span>慢慢翻，读不懂的地方就停下来。</span>
    </footer>

    <NotesReader
      :open="readerOpen"
      :collection="activeCollection"
      :collections="notesCollections"
      :initial-index="initialIndex"
      :initial-anchor="initialAnchor"
      @close="closeReader"
      @select-collection="selectCollection"
    />
  </main>
</template>

<style scoped>
.page-notes {
  padding-bottom: var(--space-9);
}

.notes-back {
  display: inline-block;
  margin-bottom: var(--space-5);
  color: var(--fg-1);
  font-size: 0.9rem;
  transition: color 0.2s ease;
}

.notes-back:hover {
  color: var(--accent-strong);
}

/* ---- hero ---- */
.notes-hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.12fr) minmax(300px, 0.88fr);
  gap: var(--space-8);
  align-items: center;
  padding: var(--space-5) 0 var(--space-8);
}

.notes-hero::before {
  content: '';
  position: absolute;
  top: 0;
  left: -8%;
  width: min(620px, 70vw);
  aspect-ratio: 1.4 / 1;
  background: radial-gradient(
    ellipse at center,
    color-mix(in srgb, var(--accent) 16%, transparent),
    transparent 68%
  );
  filter: blur(8px);
  pointer-events: none;
}

.hero-copy {
  position: relative;
}

.notes-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 var(--space-4);
  color: var(--fg-2);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.1em;
}

.notes-eyebrow span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent-2);
  box-shadow: 0 0 12px var(--accent-2);
}

.notes-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(2.8rem, 7vw, 4.4rem);
  font-weight: 800;
  letter-spacing: -0.035em;
  line-height: 1.04;
  color: var(--fg-0);
}

.notes-sub {
  margin: var(--space-3) 0 0;
  color: var(--fg-1);
  font-size: 0.95rem;
}

.notes-highlight {
  margin: var(--space-6) 0 0;
  padding: var(--space-4) var(--space-5);
  border-left: 1px solid var(--accent-2);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  background: linear-gradient(
    90deg,
    var(--accent-2-dim),
    color-mix(in srgb, var(--accent-2-dim) 20%, transparent) 55%,
    transparent
  );
  color: var(--fg-0);
  font-size: clamp(1.08rem, 2.4vw, 1.4rem);
  font-weight: 650;
  line-height: 1.55;
  letter-spacing: 0.005em;
  text-wrap: balance;
}

.hl-ai,
.hl-key {
  color: var(--accent-2-text); /* §3.6-A 墨水档 */
}

.notes-lede {
  max-width: 38em;
  margin: var(--space-5) 0 0;
  color: var(--fg-1);
  font-size: 0.95rem;
  line-height: 1.85;
}

.hero-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-top: var(--space-6);
}

.notes-cta,
.notes-ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  height: 44px;
  padding: 0 var(--space-5);
  border-radius: var(--radius-full);
  font: inherit;
  font-size: 0.92rem;
  font-weight: 650;
  cursor: pointer;
  transition:
    transform 0.16s ease-out,
    background-color 0.16s ease-out,
    border-color 0.16s ease-out;
}

.notes-cta {
  border: 1px solid var(--accent);
  background: var(--accent);
  color: #071022;
}

.notes-cta:hover {
  background: var(--accent-strong);
  border-color: var(--accent-strong);
  transform: translateY(-1px);
}

.notes-cta:active {
  transform: translateY(0) scale(0.98);
}

.notes-ghost {
  border: 1px solid var(--line-strong);
  background: var(--glass-bg);
  color: var(--fg-0);
  box-shadow: var(--shadow-1), var(--glass-insets);
}

.notes-ghost:hover {
  border-color: var(--accent-line);
  color: var(--accent-strong);
  transform: translateY(-1px);
}

.notes-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-4);
  margin: var(--space-7) 0 0;
  padding-top: var(--space-5);
  border-top: 1px solid var(--line);
}

.notes-stats dt {
  font-family: var(--font-display);
  font-size: clamp(1.15rem, 2.6vw, 1.5rem);
  font-weight: 750;
  letter-spacing: -0.02em;
  color: var(--fg-0);
  font-variant-numeric: tabular-nums;
}

.notes-stats dd {
  margin: var(--space-1) 0 0;
  color: var(--fg-2);
  font-size: 0.78rem;
}

.notes-total-line {
  margin: var(--space-4) 0 0;
  color: var(--fg-2);
  font-size: 0.72rem;
  letter-spacing: 0.03em;
}

/* ---- 三本封面 ---- */
.cover-shelf {
  position: relative;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-3);
  align-items: start;
}

.cover-tile {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 10px;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.cover-image {
  position: relative;
  display: block;
  aspect-ratio: 3 / 4;
  overflow: hidden;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-md);
  background: #fff;
  box-shadow: var(--shadow-2);
  transition:
    transform 0.28s var(--ease-out-quart, cubic-bezier(0.22, 1, 0.36, 1)),
    border-color 0.2s ease-out,
    box-shadow 0.2s ease-out;
}

.cover-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  transition: transform 0.5s var(--ease-out-quart, cubic-bezier(0.22, 1, 0.36, 1));
}

.cover-tile--2 .cover-image {
  margin-top: 22px;
}

.cover-tile--3 .cover-image {
  margin-top: 10px;
}

.cover-tile:hover .cover-image {
  transform: translateY(-6px);
  border-color: var(--accent-line);
  box-shadow: 0 20px 48px rgba(2, 6, 16, 0.62);
}

.cover-tile:hover .cover-image img {
  transform: scale(1.02);
}

.cover-meta {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.cover-kind {
  color: var(--fg-2);
  font-size: 0.62rem;
  font-weight: 600;
  letter-spacing: 0.08em;
}

.cover-meta strong {
  overflow: hidden;
  color: var(--fg-0);
  font-size: 0.8rem;
  font-weight: 650;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cover-cta {
  color: var(--fg-2);
  font-size: 0.64rem;
  transition: color 0.18s ease-out;
}

.cover-tile:hover .cover-cta {
  color: var(--accent-strong);
}

/* ---- 通用 section ---- */
.section-head {
  margin-bottom: var(--space-6);
}

.section-kicker {
  margin: 0 0 var(--space-3);
  color: var(--accent-text); /* §3.6-A 墨水档 */
  font-size: 0.66rem;
  font-weight: 600;
  letter-spacing: 0.14em;
}

.section-head h2 {
  margin: 0;
  color: var(--fg-0);
  font-size: clamp(1.5rem, 3.2vw, 2rem);
  font-weight: 700;
  letter-spacing: -0.02em;
}

.section-head p:not(.section-kicker) {
  max-width: 58em;
  margin: var(--space-3) 0 0;
  color: var(--fg-2);
  font-size: 0.88rem;
  line-height: 1.8;
}

.notes-library,
.notes-demo,
.notes-method,
.notes-offline {
  padding: var(--space-8) 0;
  border-top: 1px solid var(--line);
}

#notes-library {
  scroll-margin-top: 6rem;
}

/* ---- 笔记卡片 ---- */
.library-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-4);
}

.note-card {
  --note-accent: var(--accent);
  display: flex;
  min-width: 0;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--glass-bg);
  box-shadow: var(--shadow-1), var(--glass-insets);
  transition:
    transform 0.22s ease-out,
    border-color 0.22s ease-out,
    box-shadow 0.22s ease-out;
}

.note-card--2 {
  --note-accent: var(--aurora-green);
}

.note-card--3 {
  --note-accent: var(--accent-2);
}

.note-card:hover {
  transform: translateY(-3px);
  border-color: color-mix(in srgb, var(--note-accent) 42%, var(--line));
  box-shadow: var(--shadow-2), var(--glass-insets);
}

.note-preview {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  padding: 0;
  border: 0;
  border-bottom: 1px solid var(--line);
  background: #fff;
  cursor: pointer;
  text-align: left;
}

.note-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  transition: transform 0.55s var(--ease-out-quart, cubic-bezier(0.22, 1, 0.36, 1));
}

.note-preview:hover img {
  transform: scale(1.025);
}

.note-preview-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(5, 8, 15, 0.08) 0%,
    transparent 36%,
    rgba(5, 8, 15, 0.2) 66%,
    rgba(5, 8, 15, 0.78) 100%
  );
  pointer-events: none;
}

.note-kind,
.note-status {
  position: absolute;
  top: 12px;
  padding: 3px 8px;
  border-radius: var(--radius-full);
  background: rgba(5, 8, 15, 0.58);
  font-size: 0.62rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  backdrop-filter: blur(8px);
}

.note-kind {
  left: 12px;
  border: 1px solid color-mix(in srgb, var(--note-accent) 46%, transparent);
  color: var(--note-accent);
}

.note-status {
  right: 12px;
  border: 1px solid var(--line-strong);
  color: var(--fg-1);
}

.note-preview-cta {
  position: absolute;
  right: 14px;
  bottom: 12px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #f4f8ff;
  font-size: 0.72rem;
  font-weight: 600;
  text-shadow: 0 1px 8px rgba(2, 6, 16, 0.6);
}

.note-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: var(--space-5);
}

.note-subject {
  margin: 0;
  color: var(--fg-2);
  font-size: 0.64rem;
  font-weight: 600;
  letter-spacing: 0.08em;
}

.note-body h3 {
  margin: var(--space-2) 0 0;
  color: var(--fg-0);
  font-size: 1.08rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.35;
}

.note-tagline {
  margin: var(--space-3) 0 0;
  color: var(--fg-1);
  font-size: 0.86rem;
  font-weight: 600;
  line-height: 1.65;
}

.note-desc {
  display: -webkit-box;
  margin: var(--space-3) 0 0;
  overflow: hidden;
  color: var(--fg-2);
  font-size: 0.8rem;
  line-height: 1.75;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
}

.note-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-2);
  margin: var(--space-5) 0 0;
  padding: var(--space-3) 0;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}

.note-metrics dt {
  color: var(--fg-0);
  font-family: var(--font-display);
  font-size: 1.18rem;
  font-weight: 750;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

.note-metrics dd {
  margin: 1px 0 0;
  color: var(--fg-2);
  font-size: 0.68rem;
}

.note-chapters {
  margin: var(--space-3) 0 0;
  overflow: hidden;
  color: var(--fg-2);
  font-size: 0.64rem;
  line-height: 1.6;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  margin-top: auto;
  padding-top: var(--space-4);
}

.note-read,
.note-download {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 38px;
  border-radius: var(--radius-full);
  font: inherit;
  font-size: 0.78rem;
  font-weight: 650;
  cursor: pointer;
  transition:
    transform 0.16s ease-out,
    background-color 0.16s ease-out,
    border-color 0.16s ease-out,
    color 0.16s ease-out;
}

.note-read {
  gap: 6px;
  padding: 0 14px;
  border: 1px solid var(--note-accent);
  background: var(--note-accent);
  color: #071022;
}

.note-read:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

.note-download {
  padding: 0 12px;
  border: 1px solid var(--line-strong);
  background: transparent;
  color: var(--fg-1);
  font-size: 0.66rem;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.note-download:hover {
  border-color: var(--accent-line);
  color: var(--accent-strong);
  transform: translateY(-1px);
}

/* ---- 教材式 / 大白话 ---- */
.demo-pair {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: stretch;
  gap: var(--space-4);
}

.demo-card {
  padding: var(--space-5);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--glass-bg);
  box-shadow: var(--shadow-1), var(--glass-insets);
}

.demo-card--textbook {
  background: var(--bg-2);
}

.demo-card--textbook p {
  font-family: 'Songti SC', 'SimSun', 'Noto Serif SC', serif;
  color: var(--fg-1);
}

.demo-card--plain {
  border-color: var(--accent-line);
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--accent) 12%, transparent), transparent 68%),
    var(--glass-bg);
}

.demo-tag {
  display: inline-block;
  margin-bottom: var(--space-3);
  color: var(--fg-2);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.08em;
}

.demo-card--plain .demo-tag {
  color: var(--accent-strong);
}

.demo-card p {
  margin: 0;
  color: var(--fg-1);
  font-size: 0.9rem;
  line-height: 1.85;
}

.demo-card--plain p {
  color: var(--fg-0);
  font-size: 0.93rem;
}

.demo-arrow {
  align-self: center;
  color: var(--accent-text); /* §3.6-A 墨水档 */
  font-size: 1.4rem;
}

.demo-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-top: var(--space-4);
}

.demo-foot p {
  margin: 0;
  color: var(--fg-2);
  font-size: 0.68rem;
  letter-spacing: 0.03em;
}

.demo-link {
  padding: 0;
  border: 0;
  background: none;
  color: var(--accent-text); /* §3.6-A 墨水档 */
  font: inherit;
  font-size: 0.86rem;
  cursor: pointer;
  transition: color 0.18s ease-out;
}

.demo-link:hover {
  color: var(--accent-strong);
}

/* ---- 工作流 ---- */
.method-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-4);
}

.method-step {
  padding: var(--space-5);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--glass-bg);
  box-shadow: var(--shadow-1), var(--glass-insets);
}

.method-step > span {
  color: var(--accent-text); /* §3.6-A 墨水档 */
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.06em;
}

.method-step h3 {
  margin: var(--space-3) 0 0;
  color: var(--fg-0);
  font-size: 1.02rem;
  font-weight: 650;
}

.method-step p {
  margin: var(--space-2) 0 0;
  color: var(--fg-1);
  font-size: 0.86rem;
  line-height: 1.8;
}

/* ---- 离线 ---- */
.notes-offline {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: var(--space-7);
  align-items: center;
}

.offline-copy h2 {
  margin: 0;
  color: var(--fg-0);
  font-size: clamp(1.5rem, 3.2vw, 2rem);
  font-weight: 700;
  letter-spacing: -0.02em;
}

.offline-copy p:not(.section-kicker) {
  max-width: 38em;
  margin: var(--space-3) 0 0;
  color: var(--fg-2);
  font-size: 0.88rem;
  line-height: 1.8;
}

.offline-links {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

.offline-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: var(--glass-bg);
  color: inherit;
  transition:
    transform 0.18s ease-out,
    border-color 0.18s ease-out,
    background-color 0.18s ease-out;
}

.offline-link:hover {
  transform: translateY(-2px);
  border-color: var(--accent-line);
  background: var(--bg-2);
  color: inherit;
}

.offline-tag {
  flex: none;
  min-width: 42px;
  padding: 3px 5px;
  border: 1px solid var(--line-strong);
  border-radius: 4px;
  color: var(--accent-strong);
  font-size: 0.58rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-align: center;
}

.offline-copy-block {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.offline-copy-block strong {
  overflow: hidden;
  color: var(--fg-0);
  font-size: 0.78rem;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.offline-copy-block small {
  color: var(--fg-2);
  font-size: 0.66rem;
}

.offline-link svg {
  flex: none;
  color: var(--fg-2);
}

.notes-source {
  max-width: 66em;
  margin: var(--space-7) 0 0;
  padding-top: var(--space-5);
  border-top: 1px solid var(--line);
  color: var(--fg-2);
  font-size: 0.8rem;
  line-height: 1.85;
}

.notes-end {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-top: var(--space-6);
  color: var(--fg-2);
  font-size: 0.78rem;
}

.notes-back--bottom {
  margin: 0;
}

@media (max-width: 1100px) {
  .library-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .note-card--3 {
    grid-column: 1 / -1;
  }

  .note-card--3 .note-preview {
    aspect-ratio: 21 / 9;
  }
}

@media (max-width: 900px) {
  .notes-hero {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-7);
    padding-top: 0;
  }

  .cover-shelf {
    max-width: 520px;
    width: 100%;
    justify-self: center;
  }

  .demo-pair {
    grid-template-columns: minmax(0, 1fr);
  }

  .demo-arrow {
    justify-self: center;
    transform: rotate(90deg);
  }

  .method-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .notes-offline {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-5);
  }
}

@media (max-width: 640px) {
  .notes-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-4) var(--space-5);
  }

  .cover-shelf {
    gap: 10px;
  }

  .cover-tile--2 .cover-image {
    margin-top: 14px;
  }

  .cover-tile--3 .cover-image {
    margin-top: 6px;
  }

  .cover-meta strong {
    font-size: 0.72rem;
  }

  .cover-cta {
    display: none;
  }

  .library-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .note-card--3 {
    grid-column: auto;
  }

  .note-card--3 .note-preview,
  .note-preview {
    aspect-ratio: 16 / 9;
  }

  .offline-links {
    grid-template-columns: minmax(0, 1fr);
  }

  .notes-end {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cover-image,
  .cover-image img,
  .cover-tile:hover .cover-image,
  .cover-tile:hover .cover-image img,
  .notes-cta,
  .notes-ghost,
  .notes-cta:hover,
  .notes-ghost:hover,
  .note-card,
  .note-card:hover,
  .note-preview img,
  .note-preview:hover img,
  .note-read,
  .note-download,
  .note-read:hover,
  .note-download:hover,
  .offline-link,
  .offline-link:hover,
  .demo-link {
    transition: none;
    transform: none;
  }
}
</style>
