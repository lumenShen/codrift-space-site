<script setup lang="ts">
/*
 * ThemeToggle —— 圆形主题切换钮（DESIGN-V2 §1.2/§3.1）。
 * 40×40（父上下文可用 --theme-toggle-size 覆盖为 36px 移动档）圆形、透明底、
 * hover 底 --tab-hover；暗色主题显示太阳、亮色显示月亮（图标=「点击后去往」的目标）。
 * 切换时两枚图标交叉旋转 var(--dur-fast)：旧图标转出淡去、新图标自 90° 转入；
 * prefers-reduced-motion 下直接切换（transition:none）。
 * 主题状态与持久化/meta 同步在 useTheme（index.html 内联脚本已先行落好初值）。
 */
import { useTheme } from '@/composables/useTheme';

const { theme, toggle } = useTheme();
</script>

<template>
  <button
    type="button"
    class="theme-toggle"
    :aria-label="theme === 'dark' ? '切换到亮色主题' : '切换到暗色主题'"
    @click="toggle"
  >
    <!-- 太阳（暗色主题显示） -->
    <svg class="toggle-icon" :class="{ 'is-on': theme === 'dark' }" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8" />
      <path
        d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
      />
    </svg>
    <!-- 月亮（亮色主题显示） -->
    <svg class="toggle-icon" :class="{ 'is-on': theme === 'light' }" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d="M20.5 13.2A8.5 8.5 0 1 1 10.8 3.5a7 7 0 0 0 9.7 9.7Z"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linejoin="round"
      />
    </svg>
  </button>
</template>

<style scoped>
.theme-toggle {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--theme-toggle-size, 40px);
  height: var(--theme-toggle-size, 40px);
  border: none;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--fg-1);
  cursor: pointer;
  transition:
    background-color var(--dur-fast) ease-out,
    color var(--dur-fast) ease-out,
    transform var(--dur-fast) ease-out;
}

.theme-toggle:hover {
  background: var(--tab-hover);
  color: var(--fg-0);
}

.theme-toggle:active {
  transform: scale(0.96);
}

/* 两枚图标叠在同一格子上：非激活的藏在 90° 旋转 + 透明里，
   切换时旧图标转出淡去、新图标转入（交叉旋转，var(--dur-fast)）。 */
.toggle-icon {
  position: absolute;
  opacity: 0;
  transform: rotate(90deg);
  transition:
    opacity var(--dur-fast) ease-out,
    transform var(--dur-fast) ease-out;
}

.toggle-icon.is-on {
  opacity: 1;
  transform: rotate(0deg);
}

@media (prefers-reduced-motion: reduce) {
  .theme-toggle,
  .toggle-icon {
    transition: none;
  }
}
</style>
