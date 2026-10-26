<script setup lang="ts">
/*
 * BlogListPage —— 博客列表：标签筛选（点标签过滤）+ 文章卡片。
 * 条目来自内容系统（tag 'post'；兼容未打 'post' 的演示条目，见 components/content.ts）。
 * 筛选状态落在路由 query（/?tag=xxx），与内容系统 {{tag:xxx}} 扩展的跳转互通、可分享。
 */
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import BlogCard from '@/components/BlogCard.vue';
import { selectBlogEntries } from '@/components/content';
import { notesTotals } from '@/data/notes';

const route = useRoute();
const router = useRouter();

const posts = selectBlogEntries();

/* 标签集合：列表内条目出现过的所有 tag（去重，保序） */
const tags = computed<string[]>(() => {
  const seen = new Set<string>();
  for (const p of posts) {
    for (const t of p.tags) seen.add(t);
  }
  return [...seen];
});

const activeTag = computed(() => {
  const q = route.query.tag;
  return typeof q === 'string' && q ? q : '';
});

const filtered = computed(() =>
  activeTag.value ? posts.filter((p) => p.tags.includes(activeTag.value)) : posts,
);

function setTag(tag: string): void {
  void router.replace({ query: tag ? { tag } : undefined });
}
</script>

<template>
  <main class="page-blog">
    <header class="page-head">
      <h1>博客</h1>
      <p class="page-sub">共 {{ posts.length }} 篇 · 点击标签筛选</p>
    </header>

    <RouterLink to="/notes" class="notes-banner" data-cursor="target">
      <div class="notes-banner-copy">
        <span class="notes-banner-badge">开源笔记 · {{ String(notesTotals.kinds).padStart(2, '0') }}</span>
        <h2>知识笔记文档专区</h2>
        <p class="notes-banner-hl">AI驱动的知识笔记再优化，让晦涩难懂的语言更加易懂。</p>
        <p class="notes-banner-meta">
          {{ notesTotals.kinds }} 种笔记 · {{ notesTotals.units }} 个单元 ·
          {{ (notesTotals.chars / 10000).toFixed(1) }} 万汉字 · 站内全屏阅读 / 全套 PDF 与单文件
        </p>
      </div>
      <span class="notes-banner-cta">进入笔记库 →</span>
    </RouterLink>

    <div v-if="tags.length" class="tag-row" role="group" aria-label="按标签筛选">
      <button
        type="button"
        class="tag-chip"
        :class="{ 'is-active': !activeTag }"
        :aria-pressed="!activeTag"
        data-cursor="target"
        @click="setTag('')"
      >
        全部
      </button>
      <button
        v-for="t in tags"
        :key="t"
        type="button"
        class="tag-chip"
        :class="{ 'is-active': activeTag === t }"
        :aria-pressed="activeTag === t"
        data-cursor="target"
        @click="setTag(t)"
      >
        #{{ t }}
      </button>
    </div>

    <div v-if="filtered.length" class="post-grid">
      <BlogCard v-for="p in filtered" :key="p.slug" :entry="p" />
    </div>
    <p v-else class="empty">该标签下暂无文章，<button type="button" class="empty-reset" @click="setTag('')">查看全部</button>。</p>
  </main>
</template>

<style scoped>
.page-blog {
  padding-bottom: var(--space-8);
}

.page-head {
  margin-bottom: var(--space-5);
}

.page-head h1 {
  margin: 0;
  font-size: 1.9rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.page-sub {
  margin: var(--space-2) 0 0;
  color: var(--fg-2);
  font-size: 0.88rem;
}

/* 笔记专区横幅：博客列表页里的一个常驻入口，不占文章标签体系 */
.notes-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-5);
  margin-bottom: var(--space-5);
  padding: var(--space-4) var(--space-5);
  border: 1px solid var(--accent-line);
  border-radius: var(--radius-lg);
  background:
    linear-gradient(120deg, color-mix(in srgb, var(--accent) 14%, transparent), transparent 64%),
    var(--glass-bg);
  box-shadow: var(--shadow-1), var(--glass-insets);
  color: inherit;
  /* 时长走动效令牌（DESIGN-V2 §6.2：hover 类 = --dur-fast） */
  transition:
    transform var(--dur-fast, 0.16s) ease-out,
    border-color var(--dur-fast, 0.16s) ease-out,
    box-shadow var(--dur-fast, 0.16s) ease-out;
}

.notes-banner:hover {
  transform: translateY(-2px);
  border-color: var(--accent);
  box-shadow: var(--shadow-2), var(--glass-insets);
  color: inherit;
}

.notes-banner-badge {
  display: inline-block;
  padding: 1px var(--space-2);
  border: 1px solid var(--accent-2);
  border-radius: var(--radius-full);
  /* 橙作小字取文字安全档（边框仍为 --accent-2，§3.6-C 描边例外） */
  color: var(--accent-2-text, var(--accent-2));
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.notes-banner h2 {
  margin: var(--space-2) 0 0;
  color: var(--fg-0);
  font-size: 1.05rem;
  font-weight: 700;
}

.notes-banner-hl {
  margin: var(--space-1) 0 0;
  color: var(--accent-2-text, var(--accent-2));
  font-size: 0.88rem;
  font-weight: 600;
  line-height: 1.6;
}

.notes-banner-meta {
  margin: var(--space-2) 0 0;
  color: var(--fg-2);
  font-size: 0.72rem;
  letter-spacing: 0.02em;
}

.notes-banner-cta {
  flex: none;
  color: var(--accent-text, var(--accent));
  font-size: 0.88rem;
  font-weight: 600;
}

.notes-banner:hover .notes-banner-cta {
  color: var(--accent-strong);
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: var(--space-5);
}

.tag-chip {
  padding: var(--space-1) var(--space-3);
  border: 1px solid var(--line);
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--fg-1);
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;
  transition:
    color var(--dur-fast, 0.16s) ease,
    border-color var(--dur-fast, 0.16s) ease,
    background-color var(--dur-fast, 0.16s) ease;
}

.tag-chip:hover {
  color: var(--accent-strong);
  border-color: var(--line-strong);
}

.tag-chip:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.tag-chip.is-active {
  border-color: var(--accent);
  background: var(--accent-dim);
  /* 激活标签文字：墨水档（边框保持 --accent，§3.6-C） */
  color: var(--accent-text, var(--accent));
}

.post-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-4);
}

.empty {
  margin: var(--space-7) 0 0;
  color: var(--fg-2);
  text-align: center;
}

.empty-reset {
  border: 0;
  background: none;
  padding: 0;
  color: var(--accent-text, var(--accent));
  font: inherit;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
}

@media (max-width: 640px) {
  .notes-banner {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-3);
  }
}

/* 触屏：hover 位移置 none 防粘滞悬浮态，色彩反馈保留（DESIGN-V2 §6.5） */
@media (hover: none) {
  .notes-banner:hover {
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tag-chip,
  .notes-banner {
    transition: none;
  }

  .notes-banner:hover {
    transform: none;
  }
}
</style>
