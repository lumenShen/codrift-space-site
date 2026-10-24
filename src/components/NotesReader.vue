<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import {
  noteDownloadName,
  noteFileUrl,
  type NoteChapter,
  type NoteCollection,
} from '@/data/notes';
import { useTheme } from '@/composables/useTheme';
import { notesReaderCss } from './notesReaderTheme';

const props = defineProps<{
  open: boolean;
  collection: NoteCollection | null;
  collections: NoteCollection[];
  initialIndex?: number;
  initialAnchor?: string;
}>();

const emit = defineEmits<{
  close: [];
  'select-collection': [id: string];
}>();

interface SideGroup {
  label: string;
  items: { chapter: NoteChapter; index: number }[];
}

const currentIndex = ref(0);
const currentAnchor = ref('');
const loading = ref(true);
const sidebarOpen = ref(false);
const frame = ref<HTMLIFrameElement | null>(null);
const closeButton = ref<HTMLButtonElement | null>(null);
const menuButton = ref<HTMLButtonElement | null>(null);
const { theme } = useTheme();

let restoreFocus: HTMLElement | null = null;
let bodyOverflow = '';
let bodyPaddingRight = '';
let locked = false;
let loadToken = 0;

const current = computed(() => props.collection?.chapters[currentIndex.value] ?? null);

const chapterLabel = computed(() => {
  if (!props.collection) return '';
  return `${currentIndex.value + 1} / ${props.collection.chapters.length}`;
});

const frameTitle = computed(() => {
  if (!props.collection || !current.value) return '笔记阅读器';
  return `${props.collection.title} · ${current.value.title}`;
});

const frameSrc = computed(() => {
  if (!props.collection || !current.value) return 'about:blank';
  const base = noteFileUrl(props.collection, current.value.file);
  return currentAnchor.value ? `${base}#${currentAnchor.value}` : base;
});

const groups = computed<SideGroup[]>(() => {
  const result: SideGroup[] = [];
  props.collection?.chapters.forEach((chapter, index) => {
    const label = chapter.group ?? '';
    const last = result[result.length - 1];
    if (!last || last.label !== label) {
      result.push({ label, items: [{ chapter, index }] });
      return;
    }
    last.items.push({ chapter, index });
  });
  return result;
});

const primaryDownload = computed(() => props.collection?.downloads[0] ?? null);

watch(
  () => props.open,
  async (open) => {
    if (open) {
      currentIndex.value = props.initialIndex ?? 0;
      currentAnchor.value = props.initialAnchor ?? '';
      loading.value = true;
      sidebarOpen.value = false;
      loadToken += 1;
      lockScroll();
      window.removeEventListener('keydown', onKeydown);
      window.addEventListener('keydown', onKeydown);
      await nextTick();
      closeButton.value?.focus();
      return;
    }
    window.removeEventListener('keydown', onKeydown);
    unlockScroll();
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
  unlockScroll();
});

watch(theme, () => {
  if (!props.open) return;
  const doc = frame.value?.contentDocument;
  if (doc) applyReaderTheme(doc);
});

function lockScroll(): void {
  if (locked) return;
  restoreFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  bodyOverflow = document.body.style.overflow;
  bodyPaddingRight = document.body.style.paddingRight;
  const scrollbar = window.innerWidth - document.documentElement.clientWidth;
  document.body.style.overflow = 'hidden';
  if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;
  locked = true;
}

function unlockScroll(): void {
  if (!locked) return;
  document.body.style.overflow = bodyOverflow;
  document.body.style.paddingRight = bodyPaddingRight;
  locked = false;
  restoreFocus?.focus?.();
  restoreFocus = null;
}

function close(): void {
  emit('close');
}

function onKeydown(event: KeyboardEvent): void {
  if (!props.open || event.key !== 'Escape') return;
  event.preventDefault();
  if (sidebarOpen.value) {
    sidebarOpen.value = false;
    menuButton.value?.focus();
    return;
  }
  close();
}

function goTo(index: number, anchor = ''): void {
  if (!props.collection) return;
  const next = Math.max(0, Math.min(index, props.collection.chapters.length - 1));
  sidebarOpen.value = false;

  if (next === currentIndex.value) {
    const doc = frame.value?.contentDocument;
    const target = anchor ? doc?.getElementById(anchor) : null;
    if (target) {
      target.scrollIntoView({ block: 'start', behavior: 'smooth' });
    } else {
      frame.value?.contentWindow?.scrollTo({ top: 0, behavior: 'smooth' });
    }
    loading.value = false;
    return;
  }

  loadToken += 1;
  currentIndex.value = next;
  currentAnchor.value = anchor;
  loading.value = true;
}

function goCollection(id: string): void {
  if (!props.collection || id === props.collection.id) return;
  sidebarOpen.value = false;
  currentIndex.value = 0;
  currentAnchor.value = '';
  loading.value = true;
  loadToken += 1;
  emit('select-collection', id);
}

function onCollectionChange(event: Event): void {
  goCollection((event.target as HTMLSelectElement).value);
}

function onFrameLoad(): void {
  const element = frame.value;
  const doc = element?.contentDocument;
  if (!doc || !element || !props.collection) return;

  const token = loadToken;
  applyReaderTheme(doc);

  if (!doc.documentElement.dataset.crReaderBound) {
    doc.addEventListener('click', onDocumentClick, true);
    doc.addEventListener('keydown', onKeydown, true);
    doc.documentElement.dataset.crReaderBound = '1';
  }

  if (currentAnchor.value) {
    const anchor = currentAnchor.value;
    window.requestAnimationFrame(() => {
      doc.getElementById(anchor)?.scrollIntoView({ block: 'start' });
    });
  }

  window.setTimeout(() => {
    if (token === loadToken) loading.value = false;
  }, 140);
}

function applyReaderTheme(doc: Document): void {
  if (!props.collection) return;

  const root = doc.documentElement;
  root.classList.add('cr-embed');
  root.dataset.notesReaderMode = props.collection.id;
  root.dataset.readerTheme = theme.value;

  const css = notesReaderCss(theme.value);
  const existing = doc.getElementById('codrift-note-reader-theme') as HTMLStyleElement | null;
  if (existing) {
    existing.textContent = css;
    return;
  }

  const style = doc.createElement('style');
  style.id = 'codrift-note-reader-theme';
  style.textContent = css;
  doc.head.appendChild(style);
}

function onDocumentClick(event: MouseEvent): void {
  /* iframe 里的元素属于另一个 realm，父窗口的 `instanceof Element` 会判 false */
  const target = event.target as { closest?: (selector: string) => Element | null } | null;
  const link = target?.closest?.('a');
  if (!link || !props.collection) return;

  const href = link.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('javascript:')) {
    return;
  }

  let url: URL;
  try {
    url = new URL(href, link.ownerDocument.baseURI);
  } catch {
    return;
  }

  if (url.origin !== window.location.origin) return;

  const collection = props.collection;
  const chapterIndex = collection.chapters.findIndex((chapter) => {
    const chapterUrl = new URL(noteFileUrl(collection, chapter.file), window.location.href);
    return chapterUrl.pathname === url.pathname;
  });

  if (chapterIndex >= 0) {
    event.preventDefault();
    event.stopPropagation();
    goTo(chapterIndex, url.hash ? decodeURIComponent(url.hash.slice(1)) : '');
    return;
  }

  if (/\.(?:pdf|html?)$/i.test(url.pathname)) {
    event.preventDefault();
    window.open(url.href, '_blank', 'noopener');
  }
}

function downloadHref(file: string): string {
  return props.collection ? noteFileUrl(props.collection, file) : '#';
}
</script>

<template>
  <Teleport to="body">
    <Transition name="note-reader">
      <section
        v-if="open && collection"
        class="note-reader"
        role="dialog"
        aria-modal="true"
        :aria-label="`${collection.title} 阅读器`"
      >
        <header class="reader-bar">
          <button ref="closeButton" class="reader-back" type="button" @click="close">
            <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
              <path
                d="M10.5 3 5.5 8l5 5M5.5 8H14"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <span>笔记库</span>
          </button>

          <div class="reader-context">
            <label class="reader-collection">
              <span class="sr-only">切换笔记</span>
              <select :value="collection.id" @change="onCollectionChange">
                <option v-for="item in collections" :key="item.id" :value="item.id">
                  {{ item.shortTitle }}
                </option>
              </select>
            </label>
            <span class="reader-divider" aria-hidden="true"></span>
            <div class="reader-heading">
              <p class="reader-kicker">{{ collection.kind }} · {{ chapterLabel }}</p>
              <p class="reader-title">{{ current?.title }}</p>
            </div>
          </div>

          <div class="reader-actions">
            <button
              class="reader-icon"
              type="button"
              title="上一单元"
              :disabled="currentIndex === 0"
              @click="goTo(currentIndex - 1)"
            >
              <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
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
              class="reader-icon"
              type="button"
              title="下一单元"
              :disabled="!collection || currentIndex >= collection.chapters.length - 1"
              @click="goTo(currentIndex + 1)"
            >
              <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
                <path
                  d="m6 3 5 5-5 5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
            <a
              v-if="primaryDownload"
              class="reader-icon reader-download"
              :href="downloadHref(primaryDownload.file)"
              :download="noteDownloadName(primaryDownload.file)"
              :title="`下载${primaryDownload.label}`"
            >
              <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
                <path
                  d="M8 2.6v7.2m0 0L4.9 6.7M8 9.8l3.1-3.1M3.2 12.6h9.6"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </a>
            <button
              ref="menuButton"
              class="reader-icon reader-menu"
              type="button"
              title="展开目录"
              :aria-expanded="sidebarOpen"
              @click="sidebarOpen = !sidebarOpen"
            >
              <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                <path
                  d="M3 4.2h10M3 8h10M3 11.8h10"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
              </svg>
            </button>
            <button class="reader-icon reader-close" type="button" title="关闭阅读器（Esc）" @click="close">
              <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
                <path
                  d="m4 4 8 8M12 4l-8 8"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                />
              </svg>
            </button>
          </div>
        </header>

        <div class="reader-body">
          <button
            v-if="sidebarOpen"
            class="reader-scrim"
            type="button"
            aria-label="关闭目录"
            @click="sidebarOpen = false"
          ></button>

          <aside class="reader-side" :class="{ 'is-open': sidebarOpen }" aria-label="笔记目录">
            <div class="side-head">
              <p class="side-kind">{{ collection.kind }}</p>
              <h2>{{ collection.title }}</h2>
              <p class="side-meta">{{ collection.meta }}</p>
            </div>

            <nav class="side-nav">
              <template v-for="(group, groupIndex) in groups" :key="group.label || groupIndex">
                <p v-if="group.label" class="side-group">{{ group.label }}</p>
                <button
                  v-for="item in group.items"
                  :key="item.chapter.id"
                  class="side-item"
                  :class="{ 'is-active': item.index === currentIndex }"
                  type="button"
                  @click="goTo(item.index)"
                >
                  <span class="side-index">{{ String(item.index + 1).padStart(2, '0') }}</span>
                  <span class="side-title">{{ item.chapter.title }}</span>
                </button>
              </template>
            </nav>

            <div v-if="collection.downloads.length" class="side-foot">
              <p class="side-foot-title">离线带走</p>
              <a
                v-for="item in collection.downloads"
                :key="item.file"
                class="side-download"
                :href="downloadHref(item.file)"
                :download="noteDownloadName(item.file)"
              >
                <span class="side-download-tag">{{ item.tag }}</span>
                <span class="side-download-copy">
                  <span>{{ item.label }}</span>
                  <small>{{ item.note }}</small>
                </span>
                <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                  <path
                    d="M8 2.6v7.2m0 0L4.9 6.7M8 9.8l3.1-3.1M3.2 12.6h9.6"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </a>
            </div>
          </aside>

          <div class="reader-main">
            <div class="reader-progress" :class="{ 'is-done': !loading }"></div>
            <div v-if="loading" class="reader-loading" aria-live="polite">
              <span class="reader-spinner" aria-hidden="true"></span>
              <p>正在翻开《{{ current?.title }}》</p>
            </div>
            <iframe
              ref="frame"
              class="reader-frame"
              :class="{ 'is-ready': !loading }"
              :src="frameSrc"
              :title="frameTitle"
              @load="onFrameLoad"
            ></iframe>
          </div>
        </div>
      </section>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.note-reader {
  position: fixed;
  inset: 0;
  z-index: var(--z-reader);
  display: flex;
  flex-direction: column;
  background: var(--bg-0);
  overflow: hidden;
}

.reader-bar {
  position: relative;
  z-index: 4;
  display: flex;
  flex: none;
  align-items: center;
  gap: var(--space-3);
  height: 64px;
  padding: 0 var(--space-4);
  border-bottom: 1px solid var(--line);
  background: color-mix(in srgb, var(--bg-1) 88%, transparent);
  backdrop-filter: blur(18px) saturate(1.3);
}

.reader-back {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 12px 0 10px;
  border: 1px solid transparent;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--fg-1);
  font: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    color 0.16s ease-out,
    background-color 0.16s ease-out,
    border-color 0.16s ease-out;
}

.reader-back:hover {
  border-color: var(--line);
  background: var(--glass-bg);
  color: var(--fg-0);
}

.reader-context {
  display: flex;
  flex: 1;
  min-width: 0;
  align-items: center;
  gap: var(--space-3);
}

.reader-collection {
  position: relative;
  flex: none;
}

.reader-collection::after {
  content: '';
  position: absolute;
  top: 50%;
  right: 12px;
  width: 5px;
  height: 5px;
  border-right: 1.4px solid var(--fg-2);
  border-bottom: 1.4px solid var(--fg-2);
  transform: translateY(-70%) rotate(45deg);
  pointer-events: none;
}

.reader-collection select {
  max-width: 150px;
  height: 34px;
  padding: 0 30px 0 12px;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-full);
  background: var(--glass-bg);
  color: var(--fg-0);
  font: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  appearance: none;
  cursor: pointer;
}

.reader-collection select option {
  background: var(--bg-2);
  color: var(--fg-0);
}

.reader-divider {
  flex: none;
  width: 1px;
  height: 22px;
  background: var(--line);
}

.reader-heading {
  min-width: 0;
}

.reader-kicker {
  margin: 0;
  color: var(--fg-2);
  font-size: 0.66rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.reader-title {
  margin: 2px 0 0;
  overflow: hidden;
  color: var(--fg-0);
  font-size: 0.9rem;
  font-weight: 650;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reader-actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: 4px;
}

.reader-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid transparent;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--fg-1);
  cursor: pointer;
  transition:
    color 0.16s ease-out,
    background-color 0.16s ease-out,
    border-color 0.16s ease-out;
}

.reader-icon:hover:not(:disabled) {
  border-color: var(--line);
  background: var(--glass-bg);
  color: var(--fg-0);
}

.reader-icon:disabled {
  opacity: 0.32;
  cursor: default;
}

.reader-close:hover {
  border-color: color-mix(in srgb, #e5484d 42%, var(--line)) !important;
  color: color-mix(in srgb, #e5484d 72%, var(--fg-0));
}

.reader-menu {
  display: none;
}

.reader-body {
  position: relative;
  display: flex;
  flex: 1;
  min-height: 0;
}

.reader-side {
  position: relative;
  z-index: 3;
  display: flex;
  flex: none;
  flex-direction: column;
  width: 318px;
  min-height: 0;
  border-right: 1px solid var(--line);
  background: linear-gradient(180deg, var(--bg-2), var(--bg-1));
}

.side-head {
  flex: none;
  padding: var(--space-5) var(--space-5) var(--space-4);
  border-bottom: 1px solid var(--line);
}

.side-kind {
  margin: 0;
  color: var(--accent-text); /* §3.6-A 墨水档 */
  font-size: 0.66rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.side-head h2 {
  margin: var(--space-2) 0 0;
  color: var(--fg-0);
  font-size: 1.08rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.35;
}

.side-meta {
  margin: var(--space-2) 0 0;
  color: var(--fg-2);
  font-size: 0.68rem;
  line-height: 1.6;
}

.side-nav {
  flex: 1;
  min-height: 0;
  padding: var(--space-3) var(--space-3) var(--space-4);
  overflow-y: auto;
  overscroll-behavior: contain;
}

.side-group {
  margin: var(--space-4) 0 var(--space-2);
  padding: 0 10px;
  color: var(--fg-2);
  font-size: 0.64rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  line-height: 1.5;
}

.side-group:first-child {
  margin-top: 0;
}

.side-item {
  display: flex;
  width: 100%;
  align-items: flex-start;
  gap: 10px;
  padding: 9px 10px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--fg-1);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    color 0.16s ease-out,
    background-color 0.16s ease-out,
    border-color 0.16s ease-out;
}

.side-item:hover {
  background: var(--tab-hover);
  color: var(--fg-0);
}

.side-item.is-active {
  border-color: var(--accent-line);
  background: var(--accent-dim);
  color: var(--fg-0);
}

.side-index {
  flex: none;
  padding-top: 1px;
  color: var(--fg-2);
  font-size: 0.66rem;
  font-variant-numeric: tabular-nums;
}

.side-item.is-active .side-index {
  color: var(--accent-strong);
}

.side-title {
  font-size: 0.79rem;
  line-height: 1.5;
}

.side-foot {
  flex: none;
  padding: var(--space-4) var(--space-4) var(--space-5);
  border-top: 1px solid var(--line);
  background: color-mix(in srgb, var(--bg-0) 38%, transparent);
}

.side-foot-title {
  margin: 0 0 var(--space-3);
  color: var(--fg-2);
  font-size: 0.64rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.side-download {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  color: var(--fg-1);
  transition:
    color 0.16s ease-out,
    background-color 0.16s ease-out,
    border-color 0.16s ease-out;
}

.side-download + .side-download {
  margin-top: 2px;
}

.side-download:hover {
  border-color: var(--line);
  background: var(--glass-bg);
  color: var(--fg-0);
}

.side-download-tag {
  flex: none;
  min-width: 38px;
  padding: 2px 5px;
  border: 1px solid var(--line-strong);
  border-radius: 4px;
  color: var(--accent-strong);
  font-size: 0.58rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-align: center;
}

.side-download-copy {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 1px;
  font-size: 0.76rem;
}

.side-download-copy small {
  color: var(--fg-2);
  font-size: 0.65rem;
}

.side-download svg {
  flex: none;
  color: var(--fg-2);
}

.reader-main {
  position: relative;
  flex: 1;
  min-width: 0;
  min-height: 0;
  background: var(--bg-0);
}

.reader-frame {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
  background: var(--bg-0);
  opacity: 0;
  transition: opacity 0.22s ease-out;
}

.reader-frame.is-ready {
  opacity: 1;
}

.reader-progress {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 3;
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
  opacity: 1;
  transform: translateX(-100%);
  animation: reader-progress 1.15s ease-in-out infinite;
  pointer-events: none;
}

.reader-progress.is-done {
  opacity: 0;
  animation: none;
}

@keyframes reader-progress {
  to {
    transform: translateX(100%);
  }
}

.reader-loading {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  background: color-mix(in srgb, var(--bg-0) 72%, transparent);
  color: var(--fg-2);
  font-size: 0.82rem;
  backdrop-filter: blur(2px);
}

.reader-loading p {
  margin: 0;
}

.reader-spinner {
  width: 26px;
  height: 26px;
  border: 2px solid var(--line-strong);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: reader-spin 0.8s linear infinite;
}

@keyframes reader-spin {
  to {
    transform: rotate(360deg);
  }
}

.reader-scrim {
  display: none;
}

.note-reader-enter-active,
.note-reader-leave-active {
  transition:
    opacity 0.22s ease-out,
    transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}

.note-reader-enter-from,
.note-reader-leave-to {
  opacity: 0;
  transform: scale(0.986);
}

@media (max-width: 900px) {
  .reader-bar {
    height: 58px;
    padding: 0 10px;
    gap: 8px;
  }

  .reader-back {
    width: 36px;
    padding: 0;
    justify-content: center;
  }

  .reader-back span {
    display: none;
  }

  .reader-collection select {
    max-width: 118px;
    height: 32px;
    padding-left: 10px;
    font-size: 0.74rem;
  }

  .reader-divider {
    display: none;
  }

  .reader-kicker {
    display: none;
  }

  .reader-title {
    font-size: 0.78rem;
  }

  .reader-menu {
    display: inline-flex;
  }

  .reader-side {
    position: fixed;
    top: 58px;
    bottom: 0;
    left: 0;
    width: min(86vw, 340px);
    visibility: hidden;
    transform: translateX(-102%);
    transition:
      transform 0.28s cubic-bezier(0.22, 1, 0.36, 1),
      visibility 0s linear 0.28s;
    box-shadow: var(--shadow-2);
  }

  .reader-side.is-open {
    visibility: visible;
    transform: translateX(0);
    transition:
      transform 0.28s cubic-bezier(0.22, 1, 0.36, 1),
      visibility 0s;
  }

  .reader-scrim {
    position: fixed;
    inset: 58px 0 0;
    z-index: 2;
    display: block;
    border: 0;
    background: var(--scrim);
    backdrop-filter: blur(2px);
    cursor: pointer;
  }
}

@media (max-width: 560px) {
  .reader-actions {
    gap: 0;
  }

  .reader-icon {
    width: 32px;
    height: 32px;
  }

  .reader-download {
    display: none;
  }

  .reader-collection select {
    max-width: 104px;
  }

  .reader-title {
    max-width: 22vw;
  }
}

@media (prefers-reduced-motion: reduce) {
  .reader-back,
  .reader-icon,
  .side-item,
  .side-download,
  .reader-frame,
  .reader-side,
  .note-reader-enter-active,
  .note-reader-leave-active {
    transition: none;
  }

  .reader-progress {
    animation: none;
    opacity: 0;
  }

  .reader-spinner {
    animation: none;
  }
}
</style>
