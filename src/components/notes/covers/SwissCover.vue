<script setup lang="ts">
/*
 * 版式四 · 瑞士网格（swiss）
 * 整幅强调色 + 网格线 + 描边大编号。缩略图辨识度最高的一套：
 * 即便只有 96px 宽，也能一眼分出三本笔记。
 */
import { computed } from 'vue';
import type { NoteCollection } from '@/data/notes';
import { coverNo, coverTitleLines } from './cover-data';

const props = defineProps<{ collection: NoteCollection; index: number }>();

const no = computed(() => coverNo(props.index));
const title = computed(() => coverTitleLines(props.collection));
</script>

<template>
  <div class="sw">
    <span class="sw-num">{{ no }}</span>

    <div class="sw-top">
      <span>CODRIft</span>
      <span>NOTES / {{ no }}</span>
    </div>

    <div class="sw-main">
      <p class="sw-kind">{{ collection.kind }}</p>
      <p class="sw-title">
        {{ title.main }}
        <em v-if="title.sub">{{ title.sub }}</em>
      </p>
    </div>

    <div class="sw-foot">
      <div v-for="metric in collection.metrics" :key="metric.label">
        <strong>{{ metric.value }}</strong>
        <span>{{ metric.label }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sw {
  position: relative;
  display: flex;
  height: 100%;
  flex-direction: column;
  padding: 6.4cqw;
  overflow: hidden;
  background: var(--cover-accent);
  color: #071022;
}

/* 网格 */
.sw::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    repeating-linear-gradient(to right, rgba(7, 16, 34, 0.13) 0 1px, transparent 1px 20cqw),
    repeating-linear-gradient(to bottom, rgba(7, 16, 34, 0.13) 0 1px, transparent 1px 20cqw);
  pointer-events: none;
}

.sw-num {
  position: absolute;
  right: -6cqw;
  bottom: -12cqw;
  color: transparent;
  font-family: var(--font-display);
  font-size: 78cqw;
  font-weight: 800;
  letter-spacing: -0.06em;
  line-height: 0.8;
  -webkit-text-stroke: 1px rgba(7, 16, 34, 0.28);
  pointer-events: none;
}

.sw-top {
  position: relative;
  display: flex;
  justify-content: space-between;
  font-size: 2.2cqw;
  font-weight: 700;
  letter-spacing: 0.2em;
  opacity: 0.6;
}

.sw-main {
  position: relative;
  margin-top: auto;
  margin-bottom: 7cqw;
}

.sw-kind {
  display: inline-block;
  padding: 0.9cqw 2.2cqw;
  background: #071022;
  color: var(--cover-accent);
  font-size: 2.2cqw;
  font-weight: 700;
  letter-spacing: 0.16em;
}

.sw-title {
  margin-top: 3.6cqw;
  font-family: var(--font-display);
  font-size: 10.4cqw;
  font-weight: 850;
  letter-spacing: -0.04em;
  line-height: 1.02;
}

.sw-title em {
  display: block;
  margin-top: 1.6cqw;
  font-size: 0.5em;
  font-style: normal;
  font-weight: 700;
  letter-spacing: 0.14em;
  opacity: 0.72;
}

.sw-foot {
  position: relative;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 2cqw;
  padding-top: 3cqw;
  border-top: 1px solid rgba(7, 16, 34, 0.34);
}

.sw-foot strong {
  display: block;
  font-family: var(--font-display);
  font-size: 5.2cqw;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.sw-foot span {
  display: block;
  margin-top: 1.2cqw;
  font-size: 2.1cqw;
  font-weight: 600;
  letter-spacing: 0.06em;
  opacity: 0.62;
}
</style>
