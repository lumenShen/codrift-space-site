<script setup lang="ts">
/*
 * SwissSections —— 首页 hero 之下的板块区。
 *
 * 沿用 12 栏栅格与两位编号，视觉语言与 hero 对齐：display 大字、极光柔光、
 * 玻璃卡、胶囊控件，不再使用粗规线与反白海报块。
 * hero 不在本组件内、也不消费本组件的任何样式；这里只接管 `.sections` 原本要渲染的内容。
 * 内容仍来自内容系统（about/contact/skills/now）与页面数据（repos/latestPosts）。
 */
import { computed } from 'vue';
import type { ContentEntry } from '@/content-system';
import type { HomeSection } from '@/components/content';
import type { RepoItem } from './types';
import SwissEntrySection from './SwissEntrySection.vue';
import SwissPortfolio from './SwissPortfolio.vue';
import SwissPosts from './SwissPosts.vue';
import './swiss.css';

const props = defineProps<{
  sections: HomeSection[];
  repos: RepoItem[];
  posts: ContentEntry[];
}>();

const KNOWN = ['about', 'contact', 'skills', 'now'];

const about = computed(() => props.sections.find((s) => s.id === 'about'));
const contact = computed(() => props.sections.find((s) => s.id === 'contact'));
const skills = computed(() => props.sections.find((s) => s.id === 'skills'));
const now = computed(() => props.sections.find((s) => s.id === 'now'));

/* 其余 home 条目（将来新增板块）按顺序接在「现在」之后，编号顺延 */
const extras = computed(() => props.sections.filter((s) => !KNOWN.includes(s.id)));

const num = (n: number): string => String(n).padStart(2, '0');
const workIndex = computed(() => num(5 + extras.value.length));
const postIndex = computed(() => num(6 + extras.value.length));
</script>

<template>
  <div class="sw">
    <SwissEntrySection
      v-if="about"
      mod="about"
      index="01"
      en="About"
      :title="about.title"
      :entry="about.entry"
    >
      <template #poster>
        <div class="sw-title" aria-hidden="true">
          <span class="sw-title__l1">Codrift</span>
          <span class="sw-title__l2">Space</span>
        </div>
        <div class="sw-about__rule" aria-hidden="true"></div>
      </template>
    </SwissEntrySection>

    <SwissEntrySection
      v-if="contact"
      mod="contact"
      index="02"
      en="Contact"
      :title="contact.title"
      :entry="contact.entry"
    />

    <SwissEntrySection
      v-if="skills"
      mod="skill"
      index="03"
      en="Index"
      :title="skills.title"
      :entry="skills.entry"
      :lead="skills.entry.summary"
    />

    <SwissEntrySection v-if="now" mod="now" index="04" en="Now" :title="now.title" :entry="now.entry">
      <template #poster>
        <div v-if="now.entry.date" class="sw-now__date">
          <span class="sw-kicker">更新于</span>
          <span class="sw-now__stamp">{{ now.entry.date }}</span>
        </div>
      </template>
    </SwissEntrySection>

    <SwissEntrySection
      v-for="(s, i) in extras"
      :key="s.id"
      :mod="s.id"
      :index="num(5 + i)"
      en="Section"
      :title="s.title"
      :entry="s.entry"
    />

    <SwissPortfolio :repos="repos" :index="workIndex" />
    <SwissPosts :posts="posts" :index="postIndex" />
  </div>
</template>
