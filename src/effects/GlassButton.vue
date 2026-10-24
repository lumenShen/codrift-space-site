<script setup lang="ts">
/**
 * 玻璃按钮（项目自有，docs/CONTRACTS.md §3.7）—— GlassSurface 的胶囊按钮封装。
 * TODO-B 视觉规格在此定稿（props 签名不变，回填 §3.7）：
 *   - 尺寸映射：sm 36px / md 44px / lg 52px 高（md 即 research 笔记建议的 44px
 *     命中区档），tokens.css 无尺寸令牌，此三档为字面量；侧 padding 取
 *     --space-4/5/6，字号 13/14/15px；
 *   - 圆角 var(--radius-full)（胶囊）：GlassSurface.radiusPx 会解析计算值并夹到
 *     短边一半，视觉圆角与折射贴图严格一致（research 笔记 44px 建议）；
 *   - 材质不覆写：用 GlassSurface 契约默认组（borderWidth 0.02 / distortionScale
 *     -150 / …），全站玻璃观感一致。44px 档若实机边缘彩噪过强，先收
 *     |distortionScale|（-150 → -60~-80）再考虑 borderWidth 提到 0.06~0.10
 *     （笔记的调参顺序）—— 由调用方在 GlassSurface 上调，本组件不加旋钮；
 *   - 折射只在 Chromium 系生效；Safari/Firefox/减弱动效由 GlassSurface 自动落
 *     毛玻璃档，prefers-reduced-transparency 落近实底档，本组件无需写分支。
 *   - 动效克制：hover 抬升 1px、active 回落 0.98，transition 0.15s；
 *     prefers-reduced-motion 下关掉位移，只留焦点环与透明度反馈。
 *
 * href 形态渲染 <a>（不拦截原生跳转，click 照发）；disabled 时按钮形态走原生
 * disabled，链接形态走 aria-disabled + pointer-events:none。
 */
import { computed } from 'vue';
import GlassSurface from './GlassSurface.vue';

export type GlassButtonProps = {
  size?: 'sm' | 'md' | 'lg';
  href?: string;
  disabled?: boolean;
};

const props = withDefaults(defineProps<GlassButtonProps>(), {
  size: 'md',
  href: undefined,
  disabled: false
});

const emit = defineEmits<{ click: [event: MouseEvent] }>();

/** 高度档（px 字面量）：md = 44px 命中区（research 笔记 44px 级悬浮按钮建议） */
const HEIGHTS = { sm: 36, md: 44, lg: 52 } as const;
const heightPx = computed(() => HEIGHTS[props.size]);

function onNativeClick(e: MouseEvent): void {
  if (props.disabled) return;
  emit('click', e); // href 形态不拦截原生跳转
}
</script>

<template>
  <GlassSurface
    class="glass-btn"
    :class="{ 'glass-btn--disabled': disabled }"
    width="fit-content"
    :height="heightPx"
    border-radius="var(--radius-full)"
  >
    <a
      v-if="href"
      class="glass-btn__control"
      :class="`glass-btn__control--${size}`"
      :href="href"
      :aria-disabled="disabled || undefined"
      :tabindex="disabled ? -1 : undefined"
      @click="onNativeClick"
    >
      <slot />
    </a>
    <button
      v-else
      class="glass-btn__control"
      :class="`glass-btn__control--${size}`"
      type="button"
      :disabled="disabled"
      @click="onNativeClick"
    >
      <slot />
    </button>
  </GlassSurface>
</template>

<!--
  样式说明：GlassSurface 的默认插槽内容（.gbody 已 flex 居中）就是按钮本体；
  .glass-btn 落在 GlassSurface 根元素上（Vue 的 fallthrough class + 父作用域 id），
  承担 hover 位移与禁用态；.glass-btn__control 是真正的交互元素，占满玻璃高度
  作为命中区，宽度由内容 + padding 决定（GlassSurface 宽 fit-content）。
-->
<style scoped>
.glass-btn {
  cursor: pointer;
  transition:
    transform 0.15s ease-out,
    opacity 0.15s ease-out;
}

.glass-btn:hover {
  transform: translateY(-1px);
}

.glass-btn:active {
  transform: translateY(0) scale(0.98);
}

.glass-btn--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 链接形态的禁用：不产生点击事件，也就不会触发跳转 */
a.glass-btn__control[aria-disabled='true'] {
  pointer-events: none;
}

.glass-btn__control {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2, 8px);
  height: 100%;
  border: none;
  background: transparent;
  color: var(--fg-0);
  font-family: inherit;
  text-decoration: none;
  cursor: pointer;
  /* 焦点环跟随胶囊圆角（inherit 沿 .gbody 传到 .glass 的圆角） */
  border-radius: inherit;
}

.glass-btn__control:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.glass-btn__control--sm {
  font-size: 13px;
  padding: 0 var(--space-4, 16px);
}

.glass-btn__control--md {
  font-size: 14px;
  padding: 0 var(--space-5, 24px);
}

.glass-btn__control--lg {
  font-size: 15px;
  padding: 0 var(--space-6, 32px);
}

@media (prefers-reduced-motion: reduce) {
  .glass-btn,
  .glass-btn:hover,
  .glass-btn:active {
    transition: none;
    transform: none;
  }
}
</style>
