<script setup lang="ts">
/*
 * PortfolioCard —— 作品集卡片（名称/一句话简介/语言/star/外链）。
 * flagship（Rein）走 featured 变体：占满整行、更大字号、主色描边 + 极光蓝渐隐底；
 * 「旗舰」徽章用点题橙的实底胶囊（参考站的橙色 chip 语言）。
 * 数据为调研定稿的 GitHub 仓库信息，简介如实保留（含 BlurLyric 的归属存疑说明，
 * 卡片去留站长已确认：保留）。
 */
import { RouterLink } from 'vue-router';

defineProps<{
  name: string;
  url: string;
  description: string;
  language?: string;
  stars?: number;
  flagship?: boolean;
  /** 站内路由（如知识笔记专区），不渲染成外链新标签 */
  internal?: boolean;
  badge?: string;
  /** 需要被一眼看到的一句话，渲染成橙色边线的高亮块 */
  highlight?: string;
  featured?: boolean;
}>();
</script>

<template>
  <component
    :is="internal ? RouterLink : 'a'"
    class="repo-card"
    :class="{ 'is-flagship': flagship, 'is-featured': featured }"
    :to="internal ? url : undefined"
    :href="internal ? undefined : url"
    :target="internal ? undefined : '_blank'"
    :rel="internal ? undefined : 'noopener noreferrer'"
    data-cursor="target"
  >
    <div class="repo-head">
      <h3 class="repo-name">{{ name }}</h3>
      <span v-if="flagship" class="repo-flag">旗舰</span>
      <span v-else-if="badge" class="repo-badge">{{ badge }}</span>
      <svg class="repo-ext" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        <path
          d="M6 3h7v7M13 3L7 9M5 4H3v9h9v-2"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </div>

    <p class="repo-desc">{{ description }}</p>

    <p v-if="highlight" class="repo-highlight">{{ highlight }}</p>

    <div class="repo-meta">
      <span v-if="language" class="repo-chip">{{ language }}</span>
      <span v-if="typeof stars === 'number'" class="repo-stars">
        <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
          <path
            d="M8 1.5l2 4.1 4.5.6-3.3 3.2.8 4.5L8 11.8l-4 2.1.8-4.5L1.5 6.2 6 5.6z"
            fill="currentColor"
          />
        </svg>
        {{ stars }}
      </span>
    </div>
  </component>
</template>

<style scoped>
.repo-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
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

.repo-card:hover {
  transform: translateY(-2px);
  border-color: var(--accent-line);
  box-shadow: var(--shadow-2), var(--glass-insets);
  color: inherit;
}

.repo-card:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* 旗舰（Rein）与精选项目：主色描边 + 极光蓝渐隐底（色值经 color-mix 取自令牌） */
.repo-card.is-flagship,
.repo-card.is-featured {
  border-color: var(--accent-line);
  background:
    linear-gradient(140deg, color-mix(in srgb, var(--accent) 14%, transparent), transparent 46%),
    var(--glass-bg);
}

.repo-card.is-flagship {
  grid-column: 1 / -1;
}

.repo-card.is-flagship:hover,
.repo-card.is-featured:hover {
  border-color: var(--accent);
}

.repo-head {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.repo-name {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--fg-0);
}

.is-flagship .repo-name {
  font-size: 1.35rem;
}

/* 点题橙实底胶囊：全站唯一的橙色面，只给旗舰（字色走 --on-accent-2，亮暗同值） */
.repo-flag {
  padding: 2px var(--space-3);
  border-radius: var(--radius-full);
  background: var(--accent-2);
  color: var(--on-accent-2);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

/* 非旗舰项目的轻量徽章：主色弱化底，不与旗舰的橙色实底抢 */
.repo-badge {
  padding: 2px var(--space-2);
  border: 1px solid var(--accent-line);
  border-radius: var(--radius-full);
  background: var(--accent-dim);
  color: var(--accent-strong);
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.repo-ext {
  margin-left: auto;
  flex: none;
  color: var(--fg-2);
  transition: color var(--dur-fast, 0.16s) ease-out;
}

.repo-card:hover .repo-ext {
  color: var(--accent-strong);
}

.repo-desc {
  margin: 0;
  color: var(--fg-1);
  font-size: 0.92rem;
  line-height: 1.75;
}

.is-flagship .repo-desc {
  font-size: 0.98rem;
}

/* 作品集里唯一的高亮句：橙色 1px 边线 + 弱化橙底，承载项目的核心价值 */
.repo-highlight {
  margin: 0;
  padding: var(--space-3) var(--space-4);
  border-left: 1px solid var(--accent-2);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  background: var(--accent-2-dim);
  color: var(--fg-0);
  font-size: 0.88rem;
  font-weight: 600;
  line-height: 1.7;
}

.repo-meta {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-top: auto;
}

.repo-chip {
  padding: 1px var(--space-2);
  border: 1px solid var(--line);
  border-radius: var(--radius-full);
  color: var(--fg-2);
  font-size: 0.75rem;
}

.repo-stars {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  color: var(--fg-1);
  font-size: 0.82rem;
  font-variant-numeric: tabular-nums;
}

.repo-stars svg {
  /* 墨水用途（小号图形字）：亮色主题下须取文字安全档 --accent-text */
  color: var(--accent-text, var(--accent));
}

/* 触屏：hover 位移置 none 防粘滞悬浮态，色彩反馈保留（DESIGN-V2 §6.5） */
@media (hover: none) {
  .repo-card:hover {
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .repo-card,
  .repo-ext {
    transition: none;
  }

  .repo-card:hover {
    transform: none;
  }
}
</style>
