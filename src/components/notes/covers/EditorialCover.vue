<script setup lang="ts">
/*
 * 版式一 · 铜版纸字排（editorial）
 * 米白纸面 + 衬线主标题 + 极淡的数学符号水印。气质最接近正式出版物，
 * 在深色站点上像一本摊在桌面上的纸书。
 */
import { computed } from 'vue';
import type { NoteCollection } from '@/data/notes';
import { coverChapterLine, coverGlyph, coverNo, coverTitleLines } from './cover-data';

const props = defineProps<{ collection: NoteCollection; index: number }>();

const no = computed(() => coverNo(props.index));
const title = computed(() => coverTitleLines(props.collection));
const glyph = computed(() => coverGlyph(props.collection));
const chapterLine = computed(() => coverChapterLine(props.collection));
</script>

<template>
  <div class="ed">
    <span class="ed-glyph">{{ glyph }}</span>

    <div class="ed-top">
      <span>CODRIft · NOTEBOOK</span>
      <span class="ed-no">{{ no }}</span>
    </div>

    <div class="ed-main">
      <p class="ed-kind">{{ collection.kind }}</p>
      <p class="ed-title">
        {{ title.main }}
        <em v-if="title.sub">{{ title.sub }}</em>
      </p>
      <p class="ed-subject">{{ collection.subject }}</p>
      <p class="ed-tagline">{{ collection.tagline }}</p>
    </div>

    <div class="ed-foot">
      <ul class="ed-keys">
        <li v-for="keyword in collection.keywords.slice(0, 4)" :key="keyword">{{ keyword }}</li>
      </ul>
      <p class="ed-chapters">{{ chapterLine }}</p>
    </div>
  </div>
</template>

<style scoped>
.ed {
  position: relative;
  display: flex;
  height: 100%;
  flex-direction: column;
  padding: 6.6cqw 6.8cqw 5.6cqw;
  overflow: hidden;
  background:
    radial-gradient(120% 80% at 86% 4%, rgba(255, 255, 255, 0.72), transparent 58%),
    linear-gradient(158deg, #f5f0e6 0%, #ece4d5 58%, #e2d8c6 100%);
  color: #14171d;
}

/* 装订线 */
.ed::before {
  content: '';
  position: absolute;
  inset: 3.4cqw 0 3.4cqw 4.6cqw;
  border-left: 1px solid rgba(20, 23, 29, 0.16);
  pointer-events: none;
}

/* 纸面暗角 */
.ed::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(120% 100% at 50% 40%, transparent 58%, rgba(20, 23, 29, 0.08));
  pointer-events: none;
}

.ed-glyph {
  position: absolute;
  right: -3cqw;
  bottom: 14cqw;
  font-family: 'Songti SC', 'Noto Serif SC', 'Source Han Serif SC', serif;
  font-size: 64cqw;
  line-height: 0.78;
  color: var(--cover-accent);
  opacity: 0.12;
  transform: rotate(-7deg);
  pointer-events: none;
}

.ed-top {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-left: 2.2cqw;
  color: rgba(20, 23, 29, 0.46);
  font-size: 2.2cqw;
  font-weight: 600;
  letter-spacing: 0.16em;
}

.ed-no {
  font-variant-numeric: tabular-nums;
}

.ed-main {
  position: relative;
  margin-top: 13cqw;
  padding-left: 2.2cqw;
}

.ed-kind {
  display: flex;
  align-items: center;
  gap: 1.8cqw;
  color: rgba(20, 23, 29, 0.6);
  font-size: 2.6cqw;
  font-weight: 600;
  letter-spacing: 0.14em;
}

.ed-kind::before {
  content: '';
  width: 5.4cqw;
  height: 1px;
  background: color-mix(in srgb, var(--cover-accent) 74%, #14171d);
}

.ed-title {
  margin-top: 4.2cqw;
  font-family: 'Songti SC', 'Noto Serif SC', 'Source Han Serif SC', serif;
  font-size: 12.8cqw;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.06;
}

.ed-title em {
  display: block;
  margin-top: 1.4cqw;
  color: color-mix(in srgb, var(--cover-accent) 72%, #14171d);
  font-size: 0.5em;
  font-style: normal;
  font-weight: 600;
  letter-spacing: 0.16em;
}

.ed-subject {
  margin-top: 5cqw;
  color: rgba(20, 23, 29, 0.66);
  font-family: 'Songti SC', 'Noto Serif SC', 'Source Han Serif SC', serif;
  font-size: 3.2cqw;
  letter-spacing: 0.06em;
}

.ed-tagline {
  display: -webkit-box;
  margin-top: 2.6cqw;
  overflow: hidden;
  color: rgba(20, 23, 29, 0.52);
  font-size: 2.9cqw;
  line-height: 1.8;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.ed-foot {
  position: relative;
  margin-top: auto;
  padding: 3.4cqw 0 0 2.2cqw;
  border-top: 1px solid rgba(20, 23, 29, 0.18);
}

.ed-keys {
  display: flex;
  flex-wrap: wrap;
  gap: 1cqw 2.8cqw;
  padding: 0;
  color: rgba(20, 23, 29, 0.58);
  font-size: 2.8cqw;
  font-weight: 500;
  letter-spacing: 0.04em;
  list-style: none;
}

.ed-chapters {
  margin-top: 2.6cqw;
  overflow: hidden;
  color: rgba(20, 23, 29, 0.4);
  font-size: 2.4cqw;
  letter-spacing: 0.02em;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
