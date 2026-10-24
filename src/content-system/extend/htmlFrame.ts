/*
 * html 类型条目的隔离渲染（契约 §2.3「html 以受控方式注入」的实现方案）。
 *
 * 方案：iframe srcdoc + sandbox="allow-scripts"。
 * - srcdoc：把条目正文（去掉 frontmatter 的整页 HTML）作为内联文档挂载；
 * - 不加 allow-same-origin → 文档落在 opaque origin，脚本无法触碰宿主 DOM/存储，
 *   样式天然隔离在 iframe 内（防样式逃逸）；
 * - allow-scripts 保证自带 <script> 可运行（见种子条目 demo/particle-demo.html）。
 *
 * 资产处理（实测选型，见构建验证）：
 * - CSS/JS：按条目所在目录解析到 src/content 下的源文件（?raw），直接内联进 srcdoc
 *   （<link> → <style>，<script src> → 内联 <script>）。不用 ?url 的原因：实测 Vite 7
 *   会把 .css?url 并入公共样式包，demo 规则（如 body{overflow:hidden}）会污染宿主页样式；
 *   内联后 iframe 文档完全自包含，在 sandbox 下也无需任何子资源请求。
 *   已知限制：type="module" 的脚本不内联（语义不同），回退到 URL 解析；CSS 里出现
 *   `</style>` 时无法安全内联，保留原引用并在 dev 下告警。
 * - 图片/字体/媒体：解析到构建后 URL（?url；小文件为 data URI），改写 src 引用。
 * - 外链（http/https/data/mailto/#、`//`）与站内绝对路径（/…）原样保留。
 */

import { defineComponent, h } from 'vue';
import type { Component } from 'vue';

/**
 * src/content 下 CSS/JS 源文本（?raw），供内联进 srcdoc。
 * glob 模式相对本文件解析：本文件位于 src/content-system/extend/，故写 ../../content/**。
 */
const RAW_ASSET_MODULES = import.meta.glob('../../content/**/*.{css,js,mjs}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/** src/content 下二进制/静态资产 → 构建后 URL（?url；小文件为 data URI） */
const URL_ASSET_MODULES = import.meta.glob(
  '../../content/**/*.{png,jpg,jpeg,gif,svg,webp,avif,ico,woff,woff2,ttf,otf,mp4,webm,mp3}',
  { query: '?url', import: 'default', eager: true },
) as Record<string, string>;

const RAW_BY_PATH = new Map<string, string>();
for (const [key, raw] of Object.entries(RAW_ASSET_MODULES)) {
  const prefix = '../../content/';
  if (key.startsWith(prefix)) RAW_BY_PATH.set(key.slice(prefix.length), raw);
}

const URL_BY_PATH = new Map<string, string>();
for (const [key, url] of Object.entries(URL_ASSET_MODULES)) {
  const prefix = '../../content/';
  if (key.startsWith(prefix)) URL_BY_PATH.set(key.slice(prefix.length), url);
}

const EXTERNAL_RE = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i;

function normalizePath(path: string): string {
  const segments: string[] = [];
  for (const segment of path.split('/')) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') {
      segments.pop();
      continue;
    }
    segments.push(segment);
  }
  return segments.join('/');
}

function isSiteManaged(ref: string): boolean {
  const trimmed = ref.trim();
  return trimmed !== '' && !EXTERNAL_RE.test(trimmed) && !trimmed.startsWith('/');
}

/** 解析相对引用到 src/content 下的 CSS/JS 源文件；未命中返回 null。 */
export function resolveContentRaw(ref: string, fromDir: string): { path: string; content: string } | null {
  if (!isSiteManaged(ref)) return null;
  const path = normalizePath(`${fromDir}/${ref}`);
  const content = RAW_BY_PATH.get(path);
  return content !== undefined ? { path, content } : null;
}

/** 解析相对引用到资产 URL（构建产物路径或 data URI）；未命中返回 null。 */
export function resolveContentUrl(ref: string, fromDir: string): string | null {
  if (!isSiteManaged(ref)) return null;
  return URL_BY_PATH.get(normalizePath(`${fromDir}/${ref}`)) ?? null;
}

function getAttr(tag: string, name: string): string | null {
  const match = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i').exec(tag);
  if (match === null) return null;
  return match[1] ?? match[2] ?? '';
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) =>
    ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch === '"' ? '&quot;' : '&#39;',
  );
}

function rewriteRefs(html: string, fromDir: string): { html: string; missing: string[] } {
  const missing: string[] = [];
  const trackMissing = (ref: string) => {
    if (isSiteManaged(ref)) missing.push(ref);
  };

  let out = html;

  // 1) <link rel=stylesheet href=...> → 内联 <style>；其它 link（icon 等）尝试 URL 改写
  out = out.replace(/<link\b[^>]*>/gi, (tag) => {
    const href = getAttr(tag, 'href');
    if (href === null || href.trim() === '') return tag;
    const rel = (getAttr(tag, 'rel') ?? '').toLowerCase();
    if (rel.split(/\s+/).includes('stylesheet')) {
      const raw = resolveContentRaw(href, fromDir);
      if (raw === null) {
        trackMissing(href);
        return tag;
      }
      if (/<\/style/i.test(raw.content)) {
        // CSS 含 </style> 时无法安全内联；保留原引用，dev 下由调用方告警
        trackMissing(href);
        return tag;
      }
      return `<style data-src="${escapeHtml(raw.path)}">\n${raw.content}\n</style>`;
    }
    const url = resolveContentUrl(href, fromDir);
    if (url !== null) return tag.replace(href, url);
    trackMissing(href);
    return tag;
  });

  // 2) <script src=...></script> → 内联 <script>（type=module 除外）；否则尝试 URL 改写
  out = out.replace(
    /(<script\b[^>]*\bsrc\s*=\s*)(["'])(.*?)\2([^>]*)>(\s*)<\/script>/gi,
    (match, openLead: string, quote: string, ref: string, openTail: string, gap: string) => {
      const isModule = /type\s*=\s*["']?module["']?/i.test(`${openLead}${openTail}`);
      const raw = isModule ? null : resolveContentRaw(ref, fromDir);
      if (raw !== null) {
        // `</script` → `<\/script`：JS 字符串内 \/ 即 /，可安全防止提前闭合标签
        const js = raw.content.replace(/<\/script/gi, '<\\/script');
        return `<script data-src="${escapeHtml(raw.path)}">\n${js}\n</script>`;
      }
      const url = resolveContentUrl(ref, fromDir);
      if (url !== null) return `${openLead}${quote}${url}${quote}${openTail}>${gap}</script>`;
      trackMissing(ref);
      return match;
    },
  );

  // 3) <img|source|video|audio src=...> → URL 改写
  out = out.replace(
    /(<(?:img|source|video|audio)\b[^>]*?\bsrc\s*=\s*)(["'])(.*?)\2/gi,
    (match, lead: string, quote: string, ref: string) => {
      const url = resolveContentUrl(ref, fromDir);
      if (url !== null) return `${lead}${quote}${url}${quote}`;
      trackMissing(ref);
      return match;
    },
  );

  return { html: out, missing };
}

/** 正文 → 完整 iframe 文档。条目自带 <html> 时按整页处理，否则包一层最小外壳。 */
export function buildHtmlFrameDocument(body: string, fromDir: string): { srcdoc: string; missing: string[] } {
  const { html, missing } = rewriteRefs(body.trim(), fromDir);
  if (/<html[\s>]/i.test(html)) {
    return { srcdoc: html, missing };
  }
  const srcdoc = [
    '<!DOCTYPE html>',
    '<html lang="zh-CN">',
    '<head>',
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<style>html,body{margin:0;padding:0}</style>',
    '</head>',
    '<body>',
    html,
    '</body>',
    '</html>',
  ].join('\n');
  return { srcdoc, missing };
}

/** 生成 html 条目的挂载组件（iframe 外框 + srcdoc 文档） */
export function createHtmlFrame(srcdoc: string, title: string): Component {
  return defineComponent({
    name: 'ContentHtmlFrame',
    setup() {
      return () =>
        h('div', { class: 'ce-html-frame' }, [
          h('iframe', {
            class: 'ce-html-frame__doc',
            srcdoc,
            title,
            sandbox: 'allow-scripts',
            loading: 'lazy',
          }),
        ]);
    },
  });
}
