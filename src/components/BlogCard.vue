<script setup lang="ts">
/*
 * BlogCard —— 文章卡片（博客列表页 + 首页「博客速览」共用）。
 * 整卡即路由链接（hash 模式下 RouterLink 生成 #/blog/:slug）。
 * 卡内标签仅作展示（避免嵌套交互），筛选走列表页顶部的标签行。
 * 材质与作品卡同族：内容层玻璃（--glass-insets 光学内层）。
 */
import type { ContentEntry } from '@/content-system';

defineProps<{
  entry: ContentEntry;
}>();
</script>

<template>
  <RouterLink class="post-card" :to="`/blog/${entry.slug}`" data-cursor="target">
    <div class="post-meta">
      <time v-if="entry.date" class="post-date">{{ entry.date }}</time>
      <span v-for="t in entry.tags" :key="t" class="post-tag">{{ t }}</span>
    </div>
    <h3 class="post-title">{{ entry.title }}</h3>
    <p v-if="entry.summary" class="post-summary">{{ entry.summary }}</p>
  </RouterLink>
</template>

<style scoped>
.post-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  height: 100%;
  padding: var(--space-5);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--glass-bg);
  box-shadow: var(--shadow-1), var(--glass-insets);
  color: inherit;
  /* 时长走动效令牌（DESIGN-V2 §6.2：hover 类 = --dur-fast） */
  transition:
    transform var(--dur-fast, 0.16s) ease-out,
    border-color var(--dur-fast, 0.16s) ease-out,
    box-shadow var(--dur-fast, 0.16s) ease-out;
}

.post-card:hover {
  transform: translateY(-2px);
  border-color: var(--accent-line);
  box-shadow: var(--shadow-2), var(--glass-insets);
  color: inherit;
}

.post-card:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.post-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.post-date {
  color: var(--fg-2);
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
}

.post-tag {
  padding: 1px var(--space-2);
  border: 1px solid var(--line);
  border-radius: var(--radius-full);
  background: var(--accent-dim);
  color: var(--accent-strong);
  font-size: 0.72rem;
  letter-spacing: 0.04em;
}

.post-title {
  margin: 0;
  color: var(--fg-0);
  font-family: var(--font-display);
  font-size: 1.08rem;
  font-weight: 650;
  line-height: 1.5;
}

.post-summary {
  margin: 0;
  color: var(--fg-1);
  font-size: 0.9rem;
  line-height: 1.7;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 触屏：hover 位移置 none 防粘滞悬浮态，色彩反馈保留（DESIGN-V2 §6.5） */
@media (hover: none) {
  .post-card:hover {
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .post-card {
    transition: none;
  }

  .post-card:hover {
    transform: none;
  }
}
</style>
