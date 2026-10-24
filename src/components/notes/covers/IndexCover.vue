<script setup lang="ts">
/*
 * 版式三 · 索引卡（index）
 * 横线卡纸、顶部彩色标签、章节索引清单。信息密度最高的一套，
 * 适合「这套笔记里到底有什么」比「书名」更重要的时候。
 */
import { computed } from 'vue';
import type { NoteCollection } from '@/data/notes';
import { coverNo, coverTitleLines } from './cover-data';

const props = defineProps<{ collection: NoteCollection; index: number }>();

const no = computed(() => coverNo(props.index));
const title = computed(() => coverTitleLines(props.collection));
const entries = computed(() => props.collection.chapters.slice(0, 4));
</script>

<template>
  <div class="ix">
    <span class="ix-tab">{{ collection.kind }}</span>
    <span class="ix-hole"></span>

    <div class="ix-top">
      <span>INDEX / {{ no }}</span>
      <span>{{ collection.chapters.length }} CHAPTERS</span>
    </div>

    <p class="ix-title">
      {{ title.main }}
      <em v-if="title.sub">{{ title.sub }}</em>
    </p>
    <p class="ix-subject">{{ collection.subject }}</p>

    <ul class="ix-list">
      <li v-for="(chapter, i) in entries" :key="chapter.id">
        <span class="ix-idx">{{ String(i + 1).padStart(2, '0') }}</span>
        <span class="ix-name">{{ chapter.title }}</span>
      </li>
    </ul>

    <div class="ix-foot">
      <span class="ix-stamp">{{ no }} / 03</span>
      <span class="ix-keys">{{ collection.keywords.slice(0, 3).join(' · ') }}</span>
    </div>
  </div>
</template>

<style scoped>
.ix {
  position: relative;
  display: flex;
  height: 100%;
  flex-direction: column;
  padding: 11cqw 6.4cqw 5.8cqw;
  overflow: hidden;
  background:
    repeating-linear-gradient(
      to bottom,
      transparent 0 5.6cqw,
      rgba(20, 23, 29, 0.07) 5.6cqw calc(5.6cqw + 1px)
    ),
    linear-gradient(162deg, #fbf7ee 0%, #f2e9d8 62%, #ebdfca 100%);
  color: #15181e;
}

/* 卡片左侧的索引竖线 */
.ix::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 9cqw;
  width: 1px;
  background: color-mix(in srgb, var(--cover-accent) 58%, #15181e);
  opacity: 0.55;
}

.ix-tab {
  position: absolute;
  top: 0;
  left: 6.4cqw;
  padding: 1.8cqw 3.2cqw 2.2cqw;
  background: var(--cover-accent);
  color: #10131a;
  font-size: 2.2cqw;
  font-weight: 700;
  letter-spacing: 0.16em;
  clip-path: polygon(0 0, 100% 0, 100% 80%, 84% 100%, 0 100%);
}

.ix-hole {
  position: absolute;
  top: 3.4cqw;
  right: 5.8cqw;
  width: 3.2cqw;
  height: 3.2cqw;
  border-radius: 50%;
  background: rgba(20, 23, 29, 0.1);
  box-shadow:
    inset 0 1px 2px rgba(20, 23, 29, 0.3),
    0 1px 0 rgba(255, 255, 255, 0.7);
}

.ix-top {
  display: flex;
  justify-content: space-between;
  padding-left: 4.4cqw;
  color: rgba(20, 23, 29, 0.44);
  font-size: 2.1cqw;
  font-weight: 600;
  letter-spacing: 0.14em;
}

.ix-title {
  margin-top: 6cqw;
  padding-left: 4.4cqw;
  font-family: var(--font-display);
  font-size: 9.4cqw;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.06;
}

.ix-title em {
  display: block;
  margin-top: 1.6cqw;
  color: color-mix(in srgb, var(--cover-accent) 64%, #15181e);
  font-size: 0.5em;
  font-style: normal;
  font-weight: 700;
  letter-spacing: 0.2em;
}

.ix-subject {
  margin-top: 3cqw;
  padding-left: 4.4cqw;
  color: rgba(20, 23, 29, 0.54);
  font-size: 2.7cqw;
  letter-spacing: 0.04em;
}

.ix-list {
  margin-top: 5.4cqw;
  padding: 0 0 0 4.4cqw;
  list-style: none;
}

.ix-list li {
  display: flex;
  align-items: baseline;
  gap: 2.4cqw;
  padding: 1.4cqw 0;
  border-bottom: 1px dotted rgba(20, 23, 29, 0.22);
}

.ix-idx {
  flex: none;
  color: color-mix(in srgb, var(--cover-accent) 66%, #15181e);
  font-size: 2.6cqw;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.ix-name {
  overflow: hidden;
  color: rgba(20, 23, 29, 0.66);
  font-size: 3cqw;
  line-height: 1.5;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ix-foot {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 2cqw;
  margin-top: auto;
  padding-left: 4.4cqw;
}

.ix-stamp {
  padding: 0.9cqw 2cqw;
  border: 1px solid color-mix(in srgb, var(--cover-accent) 62%, #15181e);
  border-radius: 2px;
  color: color-mix(in srgb, var(--cover-accent) 62%, #15181e);
  font-size: 2.2cqw;
  font-weight: 700;
  letter-spacing: 0.12em;
  transform: rotate(-5deg);
  font-variant-numeric: tabular-nums;
}

.ix-keys {
  color: rgba(20, 23, 29, 0.4);
  font-size: 1.9cqw;
  letter-spacing: 0.06em;
  text-align: right;
}
</style>
