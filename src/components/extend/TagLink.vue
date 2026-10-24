<script setup lang="ts">
/*
 * extend 组件：{{tag:xxx}} / 标签跳转（契约 §2.3 注册制，本体归页面模块）。
 * 内容系统把占位替换为本组件实例；标签名可能以 prop（name/tag）或插槽文本传入，
 * 三种形态都兜住，取到即渲染为「可点击的标签筛选跳转」（hash 路由 /blog?tag=xxx）。
 */
import { computed, useSlots } from 'vue';

const props = defineProps<{
  name?: string;
  tag?: string;
}>();

const slots = useSlots();

const tagName = computed(() => {
  const fromProps = props.name ?? props.tag;
  if (fromProps) return fromProps;
  const slotText = slots.default?.()?.[0];
  const text = typeof slotText?.children === 'string' ? slotText.children.trim() : '';
  return text;
});
</script>

<template>
  <RouterLink
    v-if="tagName"
    class="tag-link"
    :to="{ path: '/blog', query: { tag: tagName } }"
    data-cursor="target"
  >
    #{{ tagName }}
  </RouterLink>
</template>

<style scoped>
.tag-link {
  display: inline-block;
  padding: 0 var(--space-2);
  border: 1px solid var(--line);
  border-radius: var(--radius-full);
  background: var(--accent-dim);
  color: var(--accent);
  font-size: 0.85em;
  line-height: 1.6;
  transition:
    color 0.2s ease,
    border-color 0.2s ease;
}

.tag-link:hover {
  color: var(--accent-strong);
  border-color: var(--line-strong);
}

@media (prefers-reduced-motion: reduce) {
  .tag-link {
    transition: none;
  }
}
</style>
