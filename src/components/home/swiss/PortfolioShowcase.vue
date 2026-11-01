<script setup lang="ts">
/*
 * PortfolioShowcase —— 作品集：Apple 式「深色舞台 + 横向卡片轨道」。
 *
 * 结构：眉标 → 两行大标题 → 导语 → 左右圆钮 + 横向卡片（真实界面截图 + 粗体引子 +
 * 正文 + 技术栈）。卡片整张可点：站内条目走 RouterLink，站外仓库走新标签页。
 * 未进入轨道的小项目在下方以一行文字链接收口，信息不丢。
 *
 * 轮播：单向循环（卡片 1→2→3→4→1，到头后瞬间归位，不做反向长滚动），每 5.6s
 * 自动前进一步；指针悬停、键盘焦点、手动操作与触屏滑动都会暂停，离开后恢复。
 * 页面不可见（切标签页）或区块滚出视口时停表，prefers-reduced-motion 下不自动播放。
 * 原生滚动 + scroll-snap 保底：触屏可直接拖，触控板可横滑，圆钮只是入口之一。
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import type { RepoItem } from './types';

const props = defineProps<{
  repos: RepoItem[];
}>();

const showcase = computed(() => props.repos.filter((r) => r.showcase && r.image));
const rest = computed(() => props.repos.filter((r) => !(r.showcase && r.image)));

const AUTO_DELAY = 5600;
const MANUAL_HOLD = 9000;

const railRef = ref<HTMLElement | null>(null);
const rootRef = ref<HTMLElement | null>(null);

let autoTimer: number | undefined;
let holdTimer: number | undefined;
let holdUntil = 0;
let inView = false;
let hovering = false;
let focused = false;
let intersectObserver: IntersectionObserver | null = null;
let motionQuery: MediaQueryList | null = null;

function prefersReduced(): boolean {
  return motionQuery?.matches ?? false;
}

/** 一张卡 + 一个列间距；按实际布局量取，不写死像素 */
function stepSize(): number {
  const rail = railRef.value;
  if (!rail) return 360;
  const card = rail.querySelector<HTMLElement>('.pf-item');
  const gap = Number.parseFloat(getComputedStyle(rail).columnGap || '24') || 24;
  return (card?.offsetWidth ?? 320) + gap;
}

function atStart(rail: HTMLElement): boolean {
  return rail.scrollLeft <= 2;
}

function atEnd(rail: HTMLElement): boolean {
  return rail.scrollLeft >= rail.scrollWidth - rail.clientWidth - 2;
}

function canAuto(): boolean {
  const rail = railRef.value;
  if (!rail || !inView || hovering || focused || document.hidden) return false;
  if (Date.now() < holdUntil) return false;
  if (prefersReduced()) return false;
  return rail.scrollWidth - rail.clientWidth > 4;
}

function stopAuto(): void {
  if (autoTimer !== undefined) {
    window.clearInterval(autoTimer);
    autoTimer = undefined;
  }
}

function startAuto(): void {
  stopAuto();
  if (!canAuto()) return;
  autoTimer = window.setInterval(() => {
    if (canAuto()) advance(1, false);
  }, AUTO_DELAY);
}

/** 手动操作后让轮播停一会儿，避免刚滑到想看的位置又被自动带走 */
function hold(ms = MANUAL_HOLD): void {
  holdUntil = Date.now() + ms;
  stopAuto();
  if (holdTimer !== undefined) window.clearTimeout(holdTimer);
  holdTimer = window.setTimeout(() => {
    holdTimer = undefined;
    startAuto();
  }, ms);
}

/** 单方向循环：前进到末张后回到开头，后退到开头后跳到末尾。 */
function advance(dir: 1 | -1, byUser = true): void {
  const rail = railRef.value;
  if (!rail) return;
  if (byUser) hold();
  const max = rail.scrollWidth - rail.clientWidth;
  if (max <= 4) return;
  if (dir > 0 && atEnd(rail)) {
    rail.scrollTo({ left: 0, behavior: 'auto' });
    return;
  }
  if (dir < 0 && atStart(rail)) {
    rail.scrollTo({ left: max, behavior: 'auto' });
    return;
  }
  rail.scrollBy({
    left: stepSize() * dir,
    behavior: prefersReduced() ? 'auto' : 'smooth',
  });
}

function onEnter(): void {
  hovering = true;
  stopAuto();
}

function onLeave(): void {
  hovering = false;
  startAuto();
}

function onFocusIn(): void {
  focused = true;
  stopAuto();
}

function onFocusOut(event: FocusEvent): void {
  const root = rootRef.value;
  const next = event.relatedTarget as Node | null;
  if (root && next && root.contains(next)) return;
  focused = false;
  startAuto();
}

/** 触屏：手指一碰就停 9 秒，给阅读留时间 */
function onTouch(): void {
  hold();
}

function onVisibility(): void {
  if (document.hidden) stopAuto();
  else startAuto();
}

function onMotionChange(): void {
  startAuto();
}

onMounted(() => {
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  motionQuery.addEventListener('change', onMotionChange);
  document.addEventListener('visibilitychange', onVisibility);

  const root = rootRef.value;
  const rail = railRef.value;
  if (!rail) return;

  if ('IntersectionObserver' in window && root) {
    intersectObserver = new IntersectionObserver(
      ([entry]) => {
        inView = entry?.isIntersecting ?? false;
        if (inView) startAuto();
        else stopAuto();
      },
      { threshold: 0.25 },
    );
    intersectObserver.observe(root);
  } else {
    inView = true;
    startAuto();
  }
});

onBeforeUnmount(() => {
  stopAuto();
  if (holdTimer !== undefined) window.clearTimeout(holdTimer);
  intersectObserver?.disconnect();
  motionQuery?.removeEventListener('change', onMotionChange);
  document.removeEventListener('visibilitychange', onVisibility);
});

function metaText(r: RepoItem): string {
  if (r.stack) return r.stack;
  const bits: string[] = [];
  if (r.language) bits.push(r.language);
  if (typeof r.stars === 'number') bits.push(`${r.stars}★`);
  return bits.join(' · ');
}
</script>

<template>
  <section
    id="portfolio"
    ref="rootRef"
    class="pf"
    aria-labelledby="pf-title"
    @pointerenter="onEnter"
    @pointerleave="onLeave"
    @focusin="onFocusIn"
    @focusout="onFocusOut"
    @touchstart.passive="onTouch"
  >
    <header class="pf-head">
      <p class="pf-eyebrow">作品集</p>
      <h2 id="pf-title" class="pf-title">把想法做成产品，<br />再让它们自己说话。</h2>
      <p class="pf-lede">
        从生活助理到知识库，从桌面 Agent 到互动小站——都是亲手写完、跑起来、现在还在用的东西。
      </p>
      <p class="pf-note">四个项目，开源或可直接体验。</p>
    </header>

    <div class="pf-railbar">
      <div class="pf-nav">
        <button
          type="button"
          class="pf-nav__btn"
          aria-label="上一个项目"
          @click="advance(-1)"
        >
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path
              d="M10 3 5 8l5 5"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
        <button
          type="button"
          class="pf-nav__btn"
          aria-label="下一个项目"
          @click="advance(1)"
        >
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path
              d="M6 3l5 5-5 5"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>

    <ul ref="railRef" class="pf-rail" role="list" aria-label="作品集轮播">
      <li v-for="r in showcase" :key="r.name" class="pf-item">
        <component
          :is="r.internal ? RouterLink : 'a'"
          class="pf-card"
          :to="r.internal ? r.url : undefined"
          :href="r.internal ? undefined : r.url"
          :target="r.internal ? undefined : '_blank'"
          :rel="r.internal ? undefined : 'noopener noreferrer'"
          data-cursor="target"
        >
          <div class="pf-media">
            <img
              :src="r.image"
              :alt="r.imageAlt ?? `${r.name} 界面截图`"
              :style="{ objectPosition: r.imagePosition ?? 'center' }"
              width="1600"
              height="1067"
            />
          </div>
          <p class="pf-caption">
            <strong>{{ r.lead ?? `${r.name}。` }}</strong>{{ r.description }}
          </p>
          <p v-if="metaText(r)" class="pf-meta">{{ metaText(r) }}</p>
          <span v-if="r.internal" class="pf-arrow" aria-hidden="true">
            站内翻开
            <svg viewBox="0 0 16 16" width="12" height="12">
              <path
                d="M3 8h10M9 4l4 4-4 4"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
        </component>
      </li>
    </ul>

    <p v-if="rest.length" class="pf-more">
      <span class="pf-more__label">还有</span>
      <template v-for="(r, i) in rest" :key="r.name">
        <span v-if="i > 0" class="pf-more__dot" aria-hidden="true">·</span>
        <component
          :is="r.internal ? RouterLink : 'a'"
          class="pf-more__link"
          :to="r.internal ? r.url : undefined"
          :href="r.internal ? undefined : r.url"
          :target="r.internal ? undefined : '_blank'"
          :rel="r.internal ? undefined : 'noopener noreferrer'"
        >
          {{ r.name }}
        </component>
      </template>
      <a
        class="pf-more__link pf-more__all"
        href="https://github.com/lumenShen/"
        target="_blank"
        rel="noopener noreferrer"
      >
        全部仓库
        <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true">
          <path
            d="M4 12 12 4M6 4h6v6"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </a>
    </p>
  </section>
</template>

<style scoped>
/* 深色舞台：暗色主题下压到页面更深一层，亮色主题下是一块白面板。
   不用玻璃与极光，让截图自己成为颜色来源（Apple 式的中性底）。 */
.pf {
  --pf-pad: clamp(20px, 4.2cqi, 56px);

  margin-top: var(--sw-sec);
  padding: clamp(40px, 6.6cqi, 88px) var(--pf-pad) clamp(34px, 5cqi, 60px);
  border: 1px solid var(--line);
  border-radius: var(--sw-radius-lg);
  background: var(--bg-0);
  box-shadow: var(--shadow-2);
  overflow: hidden;
  scroll-margin-top: 6rem;
}

/* ---------- 头部 ---------- */

.pf-eyebrow {
  margin: 0;
  color: var(--fg-0);
  font-size: clamp(13px, 1.25cqi, 15px);
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: 0.01em;
}

.pf-title {
  max-width: 15em;
  margin: 10px 0 0;
  color: var(--fg-0);
  font-family: var(--font-display);
  font-size: clamp(31px, 5cqi, 56px);
  font-weight: 700;
  line-height: 1.12;
  letter-spacing: -0.028em;
  text-wrap: balance;
}

.pf-lede {
  max-width: 60ch;
  margin: 20px 0 0;
  color: var(--fg-1);
  font-size: clamp(15.5px, 1.7cqi, 19px);
  line-height: 1.65;
  text-wrap: pretty;
}

.pf-note {
  margin: 12px 0 0;
  color: var(--fg-2);
  font-size: clamp(12px, 1.15cqi, 13px);
  line-height: 1.6;
}

/* 左右圆钮：落在轨道上方、右对齐；窄屏交给触屏滑动与自动轮播 */
.pf-railbar {
  display: flex;
  justify-content: flex-end;
  margin-top: clamp(28px, 4.2cqi, 44px);
}

.pf-nav {
  display: flex;
  gap: var(--space-2);
}

.pf-nav__btn {
  display: grid;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--fg-1);
  cursor: pointer;
  place-items: center;
  transition:
    color var(--dur-fast) ease,
    border-color var(--dur-fast) ease,
    background-color var(--dur-fast) ease;
}

.pf-nav__btn:hover {
  border-color: var(--accent-line);
  background: var(--tab-hover);
  color: var(--fg-0);
}

.pf-nav__btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* ---------- 横向轨道 ---------- */

.pf-rail {
  display: flex;
  column-gap: clamp(14px, 2.2cqi, 24px);
  margin: 12px calc(var(--pf-pad) * -1) 0 0;
  padding: 0 var(--pf-pad) 4px 0;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  list-style: none;
}

.pf-rail::-webkit-scrollbar {
  display: none;
}

.pf-item {
  flex: 0 0 clamp(258px, 31cqi, 352px);
  min-width: 0;
  scroll-snap-align: start;
}

/* ---------- 卡片 ---------- */

.pf-card {
  display: block;
  height: 100%;
  color: inherit;
  text-decoration: none;
}

.pf-media {
  aspect-ratio: 3 / 2;
  border-radius: clamp(14px, 1.7cqi, 20px);
  background: var(--bg-2);
  box-shadow: inset 0 0 0 1px var(--line);
  overflow: hidden;
}

.pf-media img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  transition: transform 620ms cubic-bezier(0.22, 1, 0.36, 1);
}

.pf-card:hover .pf-media img {
  transform: scale(1.04);
}

.pf-card:focus-visible {
  outline: none;
}

.pf-card:focus-visible .pf-media {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}

.pf-caption {
  margin: 18px 0 0;
  color: var(--fg-1);
  font-size: clamp(13.5px, 1.4cqi, 15.5px);
  line-height: 1.72;
  text-wrap: pretty;
}

.pf-caption strong {
  color: var(--fg-0);
  font-weight: 700;
}

.pf-meta {
  margin: 11px 0 0;
  color: var(--fg-2);
  font-size: clamp(11.5px, 1.05cqi, 12.5px);
  line-height: 1.55;
  letter-spacing: 0.02em;
}

.pf-arrow {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 12px;
  color: var(--accent-text);
  font-size: clamp(11.5px, 1.05cqi, 12.5px);
  font-weight: 600;
  letter-spacing: 0.02em;
}

.pf-arrow svg {
  transition: transform var(--dur-fast) ease;
}

.pf-card:hover .pf-arrow svg {
  transform: translate(2px, -2px);
}

/* ---------- 其余仓库 ---------- */

.pf-more {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px 10px;
  margin: clamp(30px, 4.4cqi, 46px) 0 0;
  padding-top: clamp(18px, 2.4cqi, 26px);
  border-top: 1px solid var(--line);
  color: var(--fg-2);
  font-size: clamp(12px, 1.15cqi, 13px);
  line-height: 1.6;
}

.pf-more__label {
  color: var(--fg-2);
}

.pf-more__dot {
  color: var(--fg-2);
}

.pf-more__link {
  color: var(--fg-1);
  text-decoration: none;
  transition: color var(--dur-fast) ease;
}

.pf-more__link:hover {
  color: var(--fg-0);
}

.pf-more__all {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  color: var(--accent-text);
  font-weight: 600;
}

.pf-more__all:hover {
  color: var(--accent-strong);
}

/* ---------- 窄屏 ---------- */

@media (max-width: 820px) {
  .pf {
    --pf-pad: 18px;

    border-radius: var(--radius-lg);
  }

  .pf-railbar {
    display: none;
  }

  .pf-rail {
    margin-top: 26px;
  }

  /* 留出下一张卡的边缘，横向滑动才有可见的「还有」 */
  .pf-item {
    flex-basis: calc(100% - 34px);
  }

  .pf-more__all {
    margin-left: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pf-media img,
  .pf-arrow svg,
  .pf-nav__btn,
  .pf-more__link {
    transition: none;
  }

  .pf-card:hover .pf-media img {
    transform: none;
  }
}
</style>
