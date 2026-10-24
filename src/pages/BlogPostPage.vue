<script setup lang="ts">
/*
 * BlogPostPage —— 文章页：:slug = 内容条目 slug（契约 §1）。
 * 渲染统一走内容系统 renderEntry（html / markdown / markdownWithExtend 三种类型同一入口，
 * html 的隔离渲染、markdownWithExtend 的扩展语法均由内容系统处理）。
 * 页面侧只负责壳：返回链接、标题、元信息、标签跳转、未找到兜底；
 * 正文外包 .doc-panel 内缩圆角面板（DESIGN-V2 §2.2 文档型内容面板化）。
 */
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { getEntryBySlug } from '@/content-system';
import { ensureExtendComponentsRegistered, renderedEntry } from '@/components/content';

ensureExtendComponentsRegistered();

const route = useRoute();

const slug = computed(() => String(route.params.slug ?? ''));
const entry = computed(() => getEntryBySlug(slug.value));
const postComponent = computed(() => (entry.value ? renderedEntry(entry.value) : null));
</script>

<template>
  <main class="page-post">
    <RouterLink class="back-link" to="/blog" data-cursor="target">← 返回博客</RouterLink>

    <template v-if="entry">
      <header class="post-head">
        <h1 class="post-title">{{ entry.title }}</h1>
        <div class="post-meta">
          <time v-if="entry.date" class="post-date">{{ entry.date }}</time>
          <RouterLink
            v-for="t in entry.tags"
            :key="t"
            class="post-tag"
            :to="{ path: '/blog', query: { tag: t } }"
            data-cursor="target"
          >
            #{{ t }}
          </RouterLink>
        </div>
      </header>

      <!-- V2 §2.2「文档型内容面板化」：正文包内缩圆角面板，排版头留在外面 -->
      <div class="doc-panel">
        <article class="post-body">
          <component :is="postComponent" />
        </article>
      </div>
    </template>

    <div v-else class="missing">
      <p class="missing-title">没有找到文章「{{ slug }}」。</p>
      <RouterLink class="missing-link" to="/blog" data-cursor="target">去博客列表看看 →</RouterLink>
    </div>
  </main>
</template>

<style scoped>
.page-post {
  max-width: 820px;
  margin: 0 auto;
  padding-bottom: var(--space-8);
}

.back-link {
  display: inline-block;
  margin-bottom: var(--space-5);
  color: var(--fg-1);
  font-size: 0.9rem;
  transition: color var(--dur-fast, 0.16s) ease;
}

.back-link:hover {
  color: var(--accent-strong);
}

.post-head {
  margin-bottom: var(--space-6);
  padding-bottom: var(--space-5);
  border-bottom: 1px solid var(--line);
}

.post-title {
  margin: 0;
  font-size: clamp(1.6rem, 4vw, 2.2rem);
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: 0.01em;
}

.post-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-4);
}

.post-date {
  color: var(--fg-2);
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
}

.post-tag {
  padding: 1px var(--space-2);
  border: 1px solid var(--line);
  border-radius: var(--radius-full);
  background: var(--accent-dim);
  color: var(--accent-text, var(--accent));
  font-size: 0.78rem;
  transition: color var(--dur-fast, 0.16s) ease;
}

.post-tag:hover {
  color: var(--accent-strong);
}

/* 正文容器：排版细节由内容系统的渲染组件负责，这里只控宽度与节奏 */
.post-body {
  color: var(--fg-0);
  font-size: 1rem;
  line-height: 1.85;
}

/* V2 §2.2「同面 + 内缩圆角面板」：文章正文落一块 1px 冷描边面板。
   底色取 --doc-panel-bg（V2 新令牌），未落地时回退内容层玻璃底。 */
.doc-panel {
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  padding: var(--space-6) var(--space-7);
  background: var(--doc-panel-bg, var(--glass-bg));
  box-shadow: var(--shadow-1), var(--glass-insets);
}

@media (max-width: 640px) {
  /* 窄屏收侧留白：48px 侧距在 375px 档只剩 279px 文字列，压回 24px */
  .doc-panel {
    padding: var(--space-5);
  }
}

@media (prefers-reduced-transparency: reduce) {
  /* §6.4：面板收近实底（--glass-solid 为 V2 新令牌，回退既有玻璃兜底值） */
  .doc-panel {
    background: var(--glass-solid, var(--glass-fallback-fill));
  }
}

.missing {
  padding: var(--space-8) 0;
  text-align: center;
}

.missing-title {
  margin: 0;
  color: var(--fg-1);
}

.missing-link {
  display: inline-block;
  margin-top: var(--space-4);
  color: var(--accent-text, var(--accent));
}

@media (prefers-reduced-motion: reduce) {
  .back-link,
  .post-tag {
    transition: none;
  }
}
</style>
