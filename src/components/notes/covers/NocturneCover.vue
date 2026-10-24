<script setup lang="ts">
/*
 * 版式二 · 夜读极光（nocturne）
 * 深底、斜向极光带与大号符号水印，和站点夜景同源；三本并排时靠强调色区分。
 */
import { computed } from 'vue';
import type { NoteCollection } from '@/data/notes';
import { coverGlyph, coverNo, coverTitleLines } from './cover-data';

const props = defineProps<{ collection: NoteCollection; index: number }>();

const no = computed(() => coverNo(props.index));
const title = computed(() => coverTitleLines(props.collection));
const glyph = computed(() => coverGlyph(props.collection));
</script>

<template>
  <div class="nc">
    <span class="nc-glyph">{{ glyph }}</span>
    <span class="nc-beam"></span>

    <div class="nc-top">
      <span class="nc-dot"></span>
      <span>CODRIft · NIGHT EDITION</span>
      <span class="nc-no">{{ no }}</span>
    </div>

    <div class="nc-main">
      <p class="nc-kind">{{ collection.kind }}</p>
      <p class="nc-title">
        {{ title.main }}
        <em v-if="title.sub">{{ title.sub }}</em>
      </p>
      <p class="nc-subject">{{ collection.subject }}</p>
    </div>

    <dl class="nc-metrics">
      <div v-for="metric in collection.metrics" :key="metric.label">
        <dt>{{ metric.value }}</dt>
        <dd>{{ metric.label }}</dd>
      </div>
    </dl>
  </div>
</template>

<style scoped>
.nc {
  position: relative;
  display: flex;
  height: 100%;
  flex-direction: column;
  padding: 6.6cqw;
  overflow: hidden;
  background:
    radial-gradient(
      92% 68% at 100% 0%,
      color-mix(in srgb, var(--cover-accent) 40%, transparent),
      transparent 64%
    ),
    linear-gradient(202deg, #0a1325 0%, #060a14 58%, #04070d 100%);
  color: #eaf1ff;
}

.nc-beam {
  position: absolute;
  inset: -30% -26%;
  background: linear-gradient(
    104deg,
    transparent 36%,
    color-mix(in srgb, var(--cover-accent) 22%, transparent) 47%,
    transparent 58%
  );
  filter: blur(1.6cqw);
  pointer-events: none;
}

.nc-glyph {
  position: absolute;
  right: -6cqw;
  bottom: 10cqw;
  font-family: 'Songti SC', 'Noto Serif SC', 'Source Han Serif SC', serif;
  font-size: 72cqw;
  line-height: 0.74;
  color: var(--cover-accent);
  opacity: 0.16;
  pointer-events: none;
}

.nc-top {
  position: relative;
  display: flex;
  align-items: center;
  gap: 2cqw;
  color: rgba(234, 241, 255, 0.54);
  font-size: 2.1cqw;
  font-weight: 600;
  letter-spacing: 0.16em;
}

.nc-dot {
  width: 1.8cqw;
  height: 1.8cqw;
  border-radius: 50%;
  background: var(--cover-accent);
  box-shadow: 0 0 3cqw var(--cover-accent);
}

.nc-no {
  margin-left: auto;
  font-variant-numeric: tabular-nums;
}

.nc-main {
  position: relative;
  margin-top: 12cqw;
}

.nc-kind {
  color: var(--cover-accent);
  font-size: 2.6cqw;
  font-weight: 600;
  letter-spacing: 0.2em;
}

.nc-title {
  margin-top: 3.4cqw;
  font-family: var(--font-display);
  font-size: 11.8cqw;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.05;
}

.nc-title em {
  display: block;
  margin-top: 2cqw;
  color: var(--cover-accent);
  font-size: 0.52em;
  font-style: normal;
  font-weight: 650;
  letter-spacing: 0.12em;
}

.nc-subject {
  margin-top: 5.4cqw;
  color: rgba(234, 241, 255, 0.6);
  font-size: 2.9cqw;
  letter-spacing: 0.04em;
}

.nc-metrics {
  position: relative;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 2cqw;
  margin: auto 0 0;
  padding-top: 3.4cqw;
  border-top: 1px solid rgba(234, 241, 255, 0.16);
}

.nc-metrics dt {
  color: #f4f8ff;
  font-family: var(--font-display);
  font-size: 5.4cqw;
  font-weight: 750;
  letter-spacing: -0.03em;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.nc-metrics dd {
  margin: 1.2cqw 0 0;
  color: rgba(234, 241, 255, 0.46);
  font-size: 2.1cqw;
  letter-spacing: 0.04em;
}
</style>
