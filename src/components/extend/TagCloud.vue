<script setup lang="ts">
/*
 * extend 组件：TagCloud —— 全站标签一览（契约 §2.3 注册制，本体归页面模块）。
 * src/content/home/about.extend.md:14 的 `<!-- extend:TagCloud -->` 占位即指本组件。
 * 数据取内容系统冻结 API getAllTags()（全站去重标签），每个标签渲染为
 * 「博客列表按该标签筛选」的链接（hash 路由 /blog?tag=xxx，与 BlogListPage 的
 * route.query.tag 筛选互通，等价于内容系统 buildTagHref 的地址约定）。
 * 注册见 src/components/content.ts：registerExtendComponent('TagCloud', TagCloud)。
 */
import { computed } from 'vue';
import { getAllTags } from '@/content-system';
// side-effect import：块级/行内扩展语法（:::timeline 等 6 件套 + {{kbd}}）的页面侧注册。
// content.ts 在模块加载时 import 本组件 → 注册先于任何 renderEntry 调用，
// 走的是冻结 API registerPreTransformer/registerPostTransformer（见 ./extend-syntax.ts 与
// docs/CONTRACTS.md §2.3 扩展语法一节）。
import './extend-syntax';

const tags = computed(() => getAllTags());
</script>

<template>
  <div class="tag-cloud">
    <RouterLink
      v-for="t in tags"
      :key="t"
      class="tag-cloud__item"
      :to="{ path: '/blog', query: { tag: t } }"
      data-cursor="target"
    >
      #{{ t }}
    </RouterLink>
  </div>
</template>

<style scoped>
.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: var(--space-3) 0;
}

.tag-cloud__item {
  padding: var(--space-1) var(--space-3);
  border: 1px solid var(--line);
  border-radius: var(--radius-full);
  background: var(--accent-dim);
  color: var(--accent);
  font-size: 0.85rem;
  line-height: 1.6;
  transition:
    color 0.2s ease,
    border-color 0.2s ease;
}

.tag-cloud__item:hover {
  color: var(--accent-strong);
  border-color: var(--line-strong);
}

@media (prefers-reduced-motion: reduce) {
  .tag-cloud__item {
    transition: none;
  }
}
</style>
