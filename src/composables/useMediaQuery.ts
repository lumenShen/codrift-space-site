/*
 * useMediaQuery —— 响应式 matchMedia 布尔值（SSR 安全：无 window 时恒 false）。
 * 供 App.vue / RouterRail 的断点与偏好判断（≥1024px dock、reduced-motion 等）使用。
 */
import { onScopeDispose, ref, type Ref } from 'vue';

export function useMediaQuery(query: string): Ref<boolean> {
  const matches = ref(false);

  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    const mq = window.matchMedia(query);
    matches.value = mq.matches;
    const onChange = (e: MediaQueryListEvent): void => {
      matches.value = e.matches;
    };
    mq.addEventListener('change', onChange);
    onScopeDispose(() => mq.removeEventListener('change', onChange));
  }

  return matches;
}
