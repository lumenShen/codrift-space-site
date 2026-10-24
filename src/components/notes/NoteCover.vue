<script setup lang="ts">
/*
 * NoteCover —— 知识笔记的封面。
 *
 * 过去封面直接用内页整页截图（preview-page.png），缩到卡片尺寸后只剩一团
 * 无法辨认的灰字，缩放/裁切也随图片比例漂移。这里改为纯 CSS 的「印刷封面」：
 * 所有字号与间距用 cqw 跟随封面宽度等比缩放，任意尺寸下版式都成立，
 * 也不再有图片解码与布局抖动。
 *
 * 版式互斥、按需加载：五个变体各占一个原子组件，本组件只做调度与画框。
 */
import { computed } from 'vue';
import type { NoteCollection } from '@/data/notes';
import EditorialCover from './covers/EditorialCover.vue';
import IndexCover from './covers/IndexCover.vue';
import NocturneCover from './covers/NocturneCover.vue';
import SpineCover from './covers/SpineCover.vue';
import SwissCover from './covers/SwissCover.vue';
import { coverAccent, defaultCoverVariant, type CoverVariant } from './covers/cover-data';

const props = withDefaults(
  defineProps<{
    collection: NoteCollection;
    /** 不传则按笔记种类取默认版式 */
    variant?: CoverVariant;
    /** 丛书序号（0 起） */
    index?: number;
  }>(),
  { variant: undefined, index: 0 },
);

const variants = {
  editorial: EditorialCover,
  nocturne: NocturneCover,
  index: IndexCover,
  swiss: SwissCover,
  spine: SpineCover,
} as const;

const activeVariant = computed(() => props.variant ?? defaultCoverVariant(props.collection));
const activeCover = computed(() => variants[activeVariant.value]);

const coverStyle = computed(() => ({
  '--cover-accent': coverAccent(props.collection),
}));
</script>

<template>
  <div
    class="note-cover"
    :class="`note-cover--${activeVariant}`"
    :style="coverStyle"
    aria-hidden="true"
  >
    <component :is="activeCover" :collection="collection" :index="index" />
  </div>
</template>

<style scoped>
.note-cover {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 4;
  overflow: hidden;
  border-radius: 10px;
  background: #e9e1d2;
  box-shadow:
    0 18px 44px rgba(2, 6, 16, 0.5),
    0 2px 6px rgba(2, 6, 16, 0.35);
  /* 容器查询：内部所有尺寸都以封面自身宽度为基准 */
  container-type: inline-size;
  isolation: isolate;
}

/* 书脊侧的受光脊线：让平面封面有一点厚度感 */
.note-cover::after {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 2.4cqw;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.24),
    rgba(255, 255, 255, 0.04) 42%,
    rgba(2, 6, 16, 0.18)
  );
  pointer-events: none;
}

.note-cover--nocturne::after,
.note-cover--swiss::after {
  opacity: 0.5;
}
</style>
