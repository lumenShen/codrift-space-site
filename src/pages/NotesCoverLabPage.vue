<script setup lang="ts">
/*
 * 封面版式实验室（/notes/covers）
 *
 * 目的：在真实页面之外，把「四种笔记 × 五套版式」并排看一遍，
 * 用同一套数据判断字阶、留白与缩略图辨识度，再决定站点里用哪一套。
 * 这里只做展示，不写入任何偏好；选定后改 cover-data.ts 的 DEFAULT_VARIANTS。
 */
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import NoteCover from '@/components/notes/NoteCover.vue';
import ThemeToggle from '@/components/ThemeToggle.vue';
import { notesCollections } from '@/data/notes';
import type { CoverVariant } from '@/components/notes/covers/cover-data';

interface VariantNote {
  id: CoverVariant;
  name: string;
  en: string;
  idea: string;
  best: string;
}

const variantNotes: VariantNote[] = [
  {
    id: 'editorial',
    name: '铜版纸字排',
    en: 'Editorial',
    idea: '米白纸面、衬线大字、极淡的数学符号水印。像一本正式出版物，四本并排自动成丛书。',
    best: '适合：想要「书」的气质，且页面底色偏深。',
  },
  {
    id: 'nocturne',
    name: '夜读极光',
    en: 'Nocturne',
    idea: '深底 + 斜向极光带 + 大号符号水印，直接借用站点的夜景语言。',
    best: '适合：希望封面完全融进站点，而不是跳出来。',
  },
  {
    id: 'index',
    name: '索引卡',
    en: 'Index',
    idea: '横线卡纸、彩色标签、章节索引清单，信息密度最高。',
    best: '适合：想让读者一眼看到「里面有哪些章节」。',
  },
  {
    id: 'swiss',
    name: '瑞士网格',
    en: 'Swiss',
    idea: '整幅强调色、网格线与描边大编号。缩略到 96px 仍然一眼可分。',
    best: '适合：封面要小、要并排、要强识别。',
  },
  {
    id: 'spine',
    name: '书脊双栏',
    en: 'Spine',
    idea: '左侧整条彩色书脊竖排书名，右侧纸面放标题与目录，最像实体书。',
    best: '适合：强调「四本一整套」的收藏感。',
  },
];

/* 尺码档：同时检验缩略图与完整版式 */
const sizes = [
  { id: 'sm', label: '缩略 96', value: '96px' },
  { id: 'md', label: '常规 150', value: '150px' },
  { id: 'lg', label: '大图 220', value: '220px' },
] as const;

const activeSize = ref<'sm' | 'md' | 'lg'>('md');
const activeSizeValue = computed(
  () => sizes.find((size) => size.id === activeSize.value)?.value ?? '150px',
);

const shelfCollections = notesCollections;
</script>

<template>
  <main class="page-covers">
    <RouterLink class="covers-back" to="/notes" data-cursor="target">← 返回知识笔记库</RouterLink>

    <header class="covers-head">
      <p class="covers-kicker">COVER SYSTEM / 05</p>
      <h1>封面版式</h1>
      <p class="covers-lede">
        五种都只用排版、色块与网格，不再截取内页。字号与间距以封面自身宽度为基准（cqw），
        所以从 96px 的缩略图到整幅大图是同一份版式，不会糊、不会裁歪。
      </p>

      <div class="covers-tools">
        <div class="size-switch" role="group" aria-label="封面显示尺寸">
          <button
            v-for="size in sizes"
            :key="size.id"
            type="button"
            :class="{ 'is-active': activeSize === size.id }"
            @click="activeSize = size.id"
          >
            {{ size.label }}
          </button>
        </div>
        <ThemeToggle />
      </div>
    </header>

    <section
      v-for="(variant, index) in variantNotes"
      :key="variant.id"
      class="variant"
      :style="{ '--lab-size': activeSizeValue }"
    >
      <header class="variant-head">
        <span class="variant-no">{{ String(index + 1).padStart(2, '0') }}</span>
        <div>
          <h2>
            {{ variant.name }}
            <em>{{ variant.en }}</em>
          </h2>
          <p>{{ variant.idea }}</p>
          <p class="variant-best">{{ variant.best }}</p>
        </div>
        <code class="variant-key">{{ variant.id }}</code>
      </header>

      <div class="variant-row">
        <NoteCover
          v-for="(collection, i) in shelfCollections"
          :key="collection.id"
          :collection="collection"
          :variant="variant.id"
          :index="i"
          class="lab-cover"
        />
      </div>
    </section>

    <section class="shelf-demo" aria-labelledby="shelf-title">
      <div class="shelf-copy">
        <p class="covers-kicker">IN CONTEXT</p>
        <h2 id="shelf-title">在页面里的样子</h2>
        <p>三本并排、错落摆放，是笔记库首屏的封面架。默认版式在 cover-data.ts 的 DEFAULT_VARIANTS 里改一行即可切换。</p>
      </div>
      <div class="shelf">
        <NoteCover
          v-for="(collection, i) in shelfCollections"
          :key="collection.id"
          :collection="collection"
          :index="i"
          class="shelf-cover"
          :class="`shelf-cover--${i + 1}`"
        />
      </div>
    </section>

    <p class="covers-foot">
      封面数据全部来自 NoteCollection：标题、学科、关键词、指标与章节。新增一本笔记时不需要另做图。
    </p>
  </main>
</template>

<style scoped>
.page-covers {
  padding-bottom: var(--space-9);
}

.covers-back {
  display: inline-block;
  margin-bottom: var(--space-5);
  color: var(--fg-1);
  font-size: 0.9rem;
}

.covers-back:hover {
  color: var(--accent-strong);
}

.covers-head {
  padding-bottom: var(--space-7);
  border-bottom: 1px solid var(--line);
}

.covers-kicker {
  margin: 0 0 var(--space-3);
  color: var(--accent-text);
  font-size: 0.66rem;
  font-weight: 600;
  letter-spacing: 0.14em;
}

.covers-head h1 {
  margin: 0;
  color: var(--fg-0);
  font-size: clamp(2.2rem, 6vw, 3.4rem);
  font-weight: 800;
  letter-spacing: -0.035em;
  line-height: 1.05;
}

.covers-lede {
  max-width: 46em;
  margin: var(--space-4) 0 0;
  color: var(--fg-1);
  font-size: 0.92rem;
  line-height: 1.85;
}

.covers-tools {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin-top: var(--space-5);
}

.size-switch {
  display: inline-flex;
  padding: 3px;
  border: 1px solid var(--line);
  border-radius: var(--radius-full);
  background: var(--glass-bg);
}

.size-switch button {
  height: 32px;
  padding: 0 14px;
  border: 0;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--fg-2);
  font: inherit;
  font-size: 0.76rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    background-color 0.16s ease-out,
    color 0.16s ease-out;
}

.size-switch button:hover {
  color: var(--fg-0);
}

.size-switch button.is-active {
  background: var(--accent-dim);
  color: var(--accent-strong);
}

/* ---- 单个版式 ---- */
.variant {
  --lab-size: 150px;
  padding: var(--space-7) 0;
  border-bottom: 1px solid var(--line);
}

.variant-head {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: var(--space-4);
  align-items: start;
  margin-bottom: var(--space-5);
}

.variant-no {
  color: var(--fg-2);
  font-family: var(--font-display);
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  font-variant-numeric: tabular-nums;
  padding-top: 4px;
}

.variant-head h2 {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--space-3);
  margin: 0;
  color: var(--fg-0);
  font-size: 1.24rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.variant-head h2 em {
  color: var(--fg-2);
  font-size: 0.72rem;
  font-style: normal;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.variant-head p {
  max-width: 52em;
  margin: var(--space-2) 0 0;
  color: var(--fg-1);
  font-size: 0.86rem;
  line-height: 1.8;
}

.variant-head .variant-best {
  color: var(--fg-2);
  font-size: 0.78rem;
}

.variant-key {
  padding: 3px 8px;
  border: 1px solid var(--line-strong);
  border-radius: 4px;
  color: var(--fg-2);
  font-family: var(--font-mono);
  font-size: 0.66rem;
  letter-spacing: 0.04em;
}

.variant-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-5);
  align-items: flex-start;
}

.lab-cover {
  width: var(--lab-size);
  flex: none;
}

/* ---- 页面语境下的封面架 ---- */
.shelf-demo {
  display: grid;
  grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
  gap: var(--space-6);
  align-items: center;
  padding: var(--space-7) 0;
  border-bottom: 1px solid var(--line);
}

.shelf-copy h2 {
  margin: 0;
  color: var(--fg-0);
  font-size: clamp(1.4rem, 3vw, 1.8rem);
  font-weight: 700;
  letter-spacing: -0.02em;
}

.shelf-copy p:not(.covers-kicker) {
  max-width: 34em;
  margin: var(--space-3) 0 0;
  color: var(--fg-2);
  font-size: 0.86rem;
  line-height: 1.8;
}

.shelf {
  display: flex;
  justify-content: center;
  gap: var(--space-4);
  padding: var(--space-6) var(--space-5);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background:
    radial-gradient(120% 90% at 50% 0%, var(--bg-glow), transparent 68%),
    var(--bg-1);
  box-shadow: var(--shadow-1), var(--glass-insets);
}

.shelf-cover {
  width: 152px;
  flex: none;
  transition: transform 0.28s var(--ease-out-quart);
}

.shelf-cover--1 {
  transform: translateY(10px) rotate(-3deg);
}

.shelf-cover--2 {
  transform: translateY(-6px) rotate(1.5deg);
}

.shelf-cover--3 {
  transform: translateY(16px) rotate(3.5deg);
}

.shelf-cover:hover {
  transform: translateY(-6px) rotate(0);
}

.covers-foot {
  max-width: 56em;
  margin: var(--space-6) 0 0;
  color: var(--fg-2);
  font-size: 0.8rem;
  line-height: 1.85;
}

@media (max-width: 900px) {
  .shelf-demo {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 640px) {
  .variant-head {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .variant-key {
    display: none;
  }

  .shelf {
    gap: var(--space-3);
    padding: var(--space-5) var(--space-3);
  }

  .shelf-cover {
    width: calc((100% - var(--space-3) * 2) / 3);
  }
}

@media (prefers-reduced-motion: reduce) {
  .shelf-cover,
  .shelf-cover:hover {
    transition: none;
  }
}
</style>
