<script setup lang="ts">
/*
 * SwissPortfolio —— 作品集：旗舰玻璃媒体面板 + 索引卡列表。
 * 旗舰（Rein）用极光玻璃卡放大呈现，其余项目用编号 / 名称 / 描述 / 元数据四栏。
 * 数据仍来自 HomePage 的 repos（不复制、不改写）。
 */
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import type { RepoItem } from './types';

const props = defineProps<{
  repos: RepoItem[];
  index: string;
}>();

const flagship = computed(() => props.repos.find((r) => r.flagship)?.name ?? '');
const note = computed(() =>
  flagship.value ? `${props.repos.length} 个，${flagship.value} 是旗舰` : `${props.repos.length} 个`,
);

function metaText(r: RepoItem): string {
  const bits: string[] = [];
  if (r.language) bits.push(r.language);
  if (typeof r.stars === 'number') bits.push(`${r.stars}★`);
  return bits.join(' · ');
}

function showUrl(r: RepoItem): boolean {
  return !r.internal && r.url.startsWith('http');
}
</script>

<template>
  <section id="portfolio" class="sw-sec sw-work" aria-labelledby="sw-work-title">
    <div class="sw-head">
      <span class="sw-head__num" aria-hidden="true">{{ index }}</span>
      <h2 id="sw-work-title" class="sw-head__name">作品集</h2>
      <span class="sw-head__en" aria-hidden="true">Work</span>
    </div>

    <p class="sw-work__note">{{ note }}</p>

    <div class="sw-work__list">
      <article
        v-for="(r, i) in repos"
        :key="r.name"
        class="sw-item"
        :class="{ 'sw-item--flag': r.flagship }"
      >
        <div class="sw-item__num" aria-hidden="true">{{ String(i + 1).padStart(2, '0') }}</div>

        <div class="sw-item__name">
          <span v-if="r.flagship" class="sw-flag">旗舰</span>
          <span v-else-if="r.badge" class="sw-item__badge">{{ r.badge }}</span>
          <h3 class="sw-item__title">
            <component
              :is="r.internal ? RouterLink : 'a'"
              class="sw-item__link"
              :to="r.internal ? r.url : undefined"
              v-bind="r.internal ? {} : { href: r.url, target: '_blank', rel: 'noopener noreferrer' }"
            >
              {{ r.name }}
            </component>
          </h3>
        </div>

        <div class="sw-item__body">
          <p class="sw-item__desc">{{ r.description }}</p>
          <p v-if="r.highlight" class="sw-item__hl">{{ r.highlight }}</p>
        </div>

        <div class="sw-item__meta">
          <span v-if="metaText(r)">{{ metaText(r) }}</span>
          <a
            v-if="showUrl(r)"
            class="sw-link sw-item__url"
            :href="r.url"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ r.url }}
          </a>
        </div>
      </article>
    </div>
  </section>
</template>
