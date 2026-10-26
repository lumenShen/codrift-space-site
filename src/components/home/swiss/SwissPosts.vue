<script setup lang="ts">
/*
 * SwissPosts —— 博客速览的瑞士版式：阶梯式三条，标题做大字。
 * 数据取自内容系统最新三篇（entry.date / tags / summary / title）。
 */
import { RouterLink } from 'vue-router';
import type { ContentEntry } from '@/content-system';

defineProps<{
  posts: ContentEntry[];
  index: string;
}>();

function tagText(entry: ContentEntry): string {
  return entry.tags.filter((t) => t !== 'post' && t !== 'home').join(' / ');
}
</script>

<template>
  <section class="sw-sec sw-post" aria-labelledby="sw-post-title">
    <div class="sw-head">
      <span class="sw-head__num" aria-hidden="true">{{ index }}</span>
      <h2 id="sw-post-title" class="sw-head__name">博客</h2>
      <span class="sw-head__en" aria-hidden="true">Notes</span>
    </div>

    <div v-if="posts.length" class="sw-post__list">
      <article v-for="(p, i) in posts" :key="p.slug" class="sw-post__item">
        <div class="sw-post__idx" aria-hidden="true">{{ String(i + 1).padStart(2, '0') }}</div>
        <div class="sw-post__body">
          <div class="sw-post__meta">
            <span v-if="p.date">{{ p.date }}</span>
            <span v-if="p.date && tagText(p)" aria-hidden="true">·</span>
            <span v-if="tagText(p)">{{ tagText(p) }}</span>
          </div>
          <h3 class="sw-post__title">
            <RouterLink class="sw-post__a" :to="`/blog/${p.slug}`">{{ p.title }}</RouterLink>
          </h3>
          <p v-if="p.summary" class="sw-post__quote">「{{ p.summary }}」</p>
        </div>
      </article>
    </div>
    <p v-else class="sw-post__empty">博客文章即将上线。</p>

    <p class="sw-post__end">全部文章 <RouterLink class="sw-link" to="/blog">→</RouterLink></p>
  </section>
</template>
