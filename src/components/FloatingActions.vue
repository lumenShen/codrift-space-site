<script setup lang="ts">
/*
 * FloatingActions —— 悬浮操作按钮（契约 §0：z-index 取 --z-fab，挂 App.vue 悬浮按钮挂载点）。
 * 回到顶部（GlassButton，滚过一屏后出现）+ 联系我（mailto）。
 * 右下角竖排，避开内容主栏；按钮本体才有 pointer-events。
 */
import { onMounted, onUnmounted, ref } from 'vue';
import { GlassButton } from '@/effects';

const SHOW_AFTER = 480;

const showTop = ref(false);

function onScroll(): void {
  showTop.value = window.scrollY > SHOW_AFTER;
}

function backToTop(): void {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
});

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll);
});
</script>

<template>
  <div class="fab-stack">
    <Transition name="fab">
      <GlassButton v-if="showTop" size="md" aria-label="回到顶部" @click="backToTop">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path
            d="M12 19V5M5 12l7-7 7 7"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </GlassButton>
    </Transition>

    <GlassButton size="md" href="mailto:gozaoo@outlook.com" aria-label="联系我">
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path
          d="M3 5h18v14H3z"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linejoin="round"
        />
        <path
          d="m3 7 9 6 9-6"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </GlassButton>
  </div>
</template>

<style scoped>
.fab-stack {
  position: fixed;
  right: var(--space-4);
  bottom: var(--space-6);
  z-index: var(--z-fab);
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-3);
  pointer-events: none;
}

.fab-stack > * {
  pointer-events: auto;
}

.fab-enter-active,
.fab-leave-active {
  /* 时长走动效令牌（DESIGN-V2 §6.2/§7.11：250ms 裸值禁用） */
  transition:
    opacity var(--dur-base, 0.24s) ease-out,
    transform var(--dur-base, 0.24s) ease-out;
}

.fab-enter-from,
.fab-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@media (prefers-reduced-motion: reduce) {
  .fab-enter-active,
  .fab-leave-active {
    transition: none;
  }
}
</style>
