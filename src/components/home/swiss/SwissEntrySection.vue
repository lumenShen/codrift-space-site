<script setup lang="ts">
/*
 * SwissEntrySection —— 内容系统条目在首页板块里的外壳。
 *
 * 只做「壳」：编号 / 中文名 / 英文名 / 可选导语 / 可选字标位，
 * 正文仍由 renderEntry 渲染（内容系统保持唯一事实源，改 .md 即生效）。
 * 版式差异全部由 swiss.css 里 `.sw-<mod>` 的栅格规则完成。
 */
import type { ContentEntry } from '@/content-system';
import { renderedEntry } from '@/components/content';

defineProps<{
  /** 版式模块名：about / contact / skills / now */
  mod: string;
  /** 两位编号，如 '01' */
  index: string;
  title: string;
  en: string;
  entry: ContentEntry;
  /** 可选导语（取 frontmatter summary 等真实数据，不另写文案） */
  lead?: string;
}>();
</script>

<template>
  <section class="sw-sec" :class="`sw-${mod}`" :aria-labelledby="`sw-${mod}-title`">
    <div class="sw-head">
      <span class="sw-head__num" aria-hidden="true">{{ index }}</span>
      <h2 :id="`sw-${mod}-title`" class="sw-head__name">{{ title }}</h2>
      <span class="sw-head__en" aria-hidden="true">{{ en }}</span>
    </div>

    <slot name="poster" />

    <div v-if="lead" class="sw-lead">{{ lead }}</div>

    <component :is="renderedEntry(entry)" />
  </section>
</template>
