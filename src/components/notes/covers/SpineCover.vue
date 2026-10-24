<script setup lang="ts">
/*
 * 版式五 · 书脊双栏（spine）
 * 左侧整条彩色书脊 + 竖排书名，右侧纸面放标题与前几章目录。
 * 三本并排时最像一排真正的实体书。
 */
import { computed } from 'vue';
import type { NoteCollection } from '@/data/notes';
import { coverNo, coverTitleLines } from './cover-data';

const props = defineProps<{ collection: NoteCollection; index: number }>();

const no = computed(() => coverNo(props.index));
const title = computed(() => coverTitleLines(props.collection));
const entries = computed(() => props.collection.chapters.slice(0, 3));
</script>

<template>
  <div class="sp">
    <div class="sp-spine">
      <span class="sp-spine-title">{{ collection.shortTitle }}</span>
      <span class="sp-spine-no">{{ no }}</span>
    </div>

    <div class="sp-body">
      <p class="sp-kind">{{ collection.kind }}</p>
      <p class="sp-title">
        {{ title.main }}
        <em v-if="title.sub">{{ title.sub }}</em>
      </p>
      <p class="sp-subject">{{ collection.subject }}</p>

      <ul class="sp-list">
        <li v-for="(chapter, i) in entries" :key="chapter.id">
          <span>{{ String(i + 1).padStart(2, '0') }}</span>
          {{ chapter.title }}
        </li>
      </ul>

      <p class="sp-meta">{{ collection.meta }}</p>
    </div>
  </div>
</template>

<style scoped>
.sp {
  position: relative;
  display: flex;
  height: 100%;
  overflow: hidden;
  background: linear-gradient(164deg, #f7f2e8 0%, #efe7d7 64%, #e7dcc8 100%);
  color: #15181e;
}

/* 右侧书口：一叠纸的侧边 */
.sp::after {
  content: '';
  position: absolute;
  inset: 0 0 0 auto;
  width: 1.8cqw;
  background: repeating-linear-gradient(
    to bottom,
    rgba(20, 23, 29, 0.16) 0 1px,
    rgba(255, 255, 255, 0.5) 1px 1.4cqw
  );
  opacity: 0.7;
  pointer-events: none;
}

.sp-spine {
  display: flex;
  width: 19cqw;
  flex: none;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 6.4cqw 0 5cqw;
  background: var(--cover-accent);
  color: #071022;
}

.sp-spine-title {
  font-size: 3.1cqw;
  font-weight: 700;
  letter-spacing: 0.34em;
  writing-mode: vertical-rl;
}

.sp-spine-no {
  font-size: 2.4cqw;
  font-weight: 700;
  letter-spacing: 0.12em;
  font-variant-numeric: tabular-nums;
  opacity: 0.62;
}

.sp-body {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  padding: 6.6cqw 5.6cqw 5.4cqw 5.4cqw;
}

.sp-kind {
  color: rgba(20, 23, 29, 0.5);
  font-size: 2.2cqw;
  font-weight: 600;
  letter-spacing: 0.18em;
}

.sp-title {
  margin-top: 4cqw;
  font-family: var(--font-display);
  font-size: 8.8cqw;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.08;
}

.sp-title em {
  display: block;
  margin-top: 1.4cqw;
  color: color-mix(in srgb, var(--cover-accent) 62%, #15181e);
  font-size: 0.52em;
  font-style: normal;
  font-weight: 700;
  letter-spacing: 0.16em;
}

.sp-subject {
  margin-top: 3cqw;
  color: rgba(20, 23, 29, 0.52);
  font-size: 2.5cqw;
  letter-spacing: 0.03em;
}

.sp-list {
  margin-top: 5.4cqw;
  padding: 0;
  list-style: none;
}

.sp-list li {
  display: flex;
  gap: 1.8cqw;
  padding: 1.7cqw 0;
  overflow: hidden;
  border-top: 1px solid rgba(20, 23, 29, 0.13);
  color: rgba(20, 23, 29, 0.6);
  font-size: 2.9cqw;
  line-height: 1.5;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sp-list li span {
  flex: none;
  color: color-mix(in srgb, var(--cover-accent) 64%, #15181e);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.sp-meta {
  margin-top: auto;
  overflow: hidden;
  color: rgba(20, 23, 29, 0.4);
  font-size: 2.2cqw;
  letter-spacing: 0.02em;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
