/*
 * useTheme —— 站点主题（'dark' | 'light'）的单例状态与切换（DESIGN-V2 §3.1）。
 *
 * 主题权威载体是 html[data-theme]（index.html 首屏内联脚本在 body 解析前落好初值，
 * 防闪）；本 composable 负责：
 *   1. 读取初值（data-theme 缺失时兜底 dark）；
 *   2. toggle：写 html[data-theme] + localStorage['codrift.theme'] + 同步改写
 *      theme-color meta（单条 meta 的 content 是权威值，评审 #7：双 media meta 只跟
 *      OS，手动切主题后浏览器框不跟随）；
 *   3. 切换时给 html 挂 .theme-fade 类（base.css 中定义，240ms 后移除，
 *      reduced-motion 不挂——直接跳变）。
 *
 * 模块级单例：全站共享同一份 theme ref（ThemeToggle 等多处调用不产生多份状态）。
 */
import { ref } from 'vue';

export type Theme = 'dark' | 'light';

const THEME_KEY = 'codrift.theme';
/** theme-color meta 的权威取值（DESIGN-V2 §3.1，与内联脚本一致） */
const THEME_COLOR: Record<Theme, string> = { dark: '#070c18', light: '#f4f7fc' };
/** 与 --dur-base 同值：.theme-fade 的过渡时长（CSS 令牌 JS 读不到，注释对齐） */
const THEME_FADE_MS = 240;

function readInitialTheme(): Theme {
  if (typeof document !== 'undefined') {
    const t = document.documentElement.dataset.theme;
    if (t === 'light' || t === 'dark') return t;
  }
  return 'dark';
}

const theme = ref<Theme>(readInitialTheme());
let metaSynced = false;

function syncThemeColorMeta(t: Theme): void {
  if (typeof document === 'undefined') return;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', THEME_COLOR[t]);
}

export function useTheme(): {
  theme: typeof theme;
  toggle: () => void;
} {
  // 初始化：把 meta 拉到与当前主题一致（内联脚本已做过一次，这里是兜底与首次调用对齐）
  if (!metaSynced) {
    metaSynced = true;
    syncThemeColorMeta(theme.value);
  }

  function toggle(): void {
    const next: Theme = theme.value === 'dark' ? 'light' : 'dark';
    theme.value = next;

    const root = document.documentElement;
    // reduced-motion 时不挂 .theme-fade（DESIGN-V2 §3.1：直接跳变）
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) {
      root.classList.add('theme-fade');
      window.setTimeout(() => root.classList.remove('theme-fade'), THEME_FADE_MS);
    }

    root.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* 隐私模式等存储不可用：主题仍然生效，只是不持久化 */
    }
    syncThemeColorMeta(next);
  }

  return { theme, toggle };
}
