/*
 * 页面侧扩展语法注册（DESIGN-V2 §5.0 三轨道中的 B / C 两轨）。
 *
 * 轨道 B · 块级组件（::: 语法）：
 *   :::timeline / :::stat-grid / :::faq / :::steps / :::feature-grid / :::gallery
 *   复用现有 ::: 容器机制（containers.ts 的 calloutContainersPre 抽取 + calloutRestorePost
 *   以占位注释回填），这里只注册 PostTransformer，把回填产物
 *   `<section class="ce-callout ce-callout--<名>">[标题]<div class="ce-callout__body">…</div></section>`
 *   重写为各组件的最终 HTML —— 渲染主流程零改动，containers.ts / render.ts 不动。
 *   容器内部 markdown 已经 ctx.render 递归渲染，因此条目里可再用 {{badge}}/{{tag}}/{{kbd}} 等行内语法。
 *
 * 轨道 C · 行内语法：{{kbd:A|B}} → <kbd class="ce-kbd">A</kbd><span class="ce-kbd-plus">+</span><kbd class="ce-kbd">B</kbd>
 *   注册为 PreTransformer（追加在 inlineTemplatesPre 之后），经 mapOutsideFences /
 *   mapOutsideInlineCode 对围栏代码块与行内代码保持字面文本。
 *
 * 注册机制：本模块被 import 时在模块层调用冻结 API registerPreTransformer /
 * registerPostTransformer（pipeline.ts 的扩展点）。挂载点：TagCloud.vue 顶部 side-effect
 * import —— content.ts 在模块加载时 import TagCloud.vue，因此注册先于任何 renderEntry 调用
 * （content.ts 自身不在扩展组件施工范围，故经该 import 链接入；见 docs/CONTRACTS.md §2.3）。
 * 转换器均幂等：重复注册或对已重写输出再跑一遍，结果不变。
 *
 * 注：本文件用相对路径引内容系统 barrel（'../../content-system/index'）——自测构建
 * （vite.selftest.config.mjs）未配置 '@' 别名；barrel 是契约 §4 允许的唯一内容系统入口。
 */

import {
  mapOutsideFences,
  mapOutsideInlineCode,
  registerPostTransformer,
  registerPreTransformer,
  resolveContentUrl,
} from '../../content-system/index';
import type { PostTransformer, PreTransformer } from '../../content-system/index';

/* ---------------------------------------------------------------- *
 * 通用：文本转义（kbd 键名进入自产 HTML；契约规定内容可信，无 sanitize）
 * ---------------------------------------------------------------- */

const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeText(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch] ?? ch);
}

/* ---------------------------------------------------------------- *
 * 通用：深度感知的 HTML 扫描（只处理 callout 回填产物这一受控范围）
 *
 * splitTopLevelPipes：按「深度为 0 的 | 」切分——标签内与标签包裹的文本
 * （如 <code>a|b</code>）不算分隔符，避免误切行内代码/链接。
 * extractFirstList / splitListItems：取容器正文第一个顶层 <ul>/<ol>，
 * 再取其顶层 <li>（marked 输出良构，未闭合处兜底截断）。
 * ---------------------------------------------------------------- */

const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

const TAG_NAME_RE = /^<\/?\s*([a-zA-Z][a-zA-Z0-9-]*)/;

function splitTopLevelPipes(html: string): string[] {
  const parts: string[] = [];
  let buf = '';
  let depth = 0;
  let i = 0;
  while (i < html.length) {
    const ch = html.charAt(i);
    if (ch === '<') {
      const next = html.charAt(i + 1);
      if (html.startsWith('<!--', i)) {
        // 注释整体跳过，内部 | 不切分
        const end = html.indexOf('-->', i + 4);
        const stop = end === -1 ? html.length : end + 3;
        buf += html.slice(i, stop);
        i = stop;
        continue;
      }
      if (/[a-zA-Z/!]/.test(next)) {
        const close = html.indexOf('>', i + 1);
        if (close === -1) {
          buf += html.slice(i);
          break;
        }
        const tag = html.slice(i, close + 1);
        buf += tag;
        const isClose = tag.charAt(1) === '/';
        const name = (TAG_NAME_RE.exec(tag)?.[1] ?? '').toLowerCase();
        const selfClosed = /\/\s*>$/.test(tag);
        if (isClose) depth = Math.max(0, depth - 1);
        else if (!selfClosed && !VOID_TAGS.has(name)) depth += 1;
        i = close + 1;
        continue;
      }
    }
    if (ch === '|' && depth === 0) {
      parts.push(buf);
      buf = '';
      i += 1;
      continue;
    }
    buf += ch;
    i += 1;
  }
  parts.push(buf);
  return parts;
}

interface ListMatch {
  before: string;
  after: string;
  inner: string;
  ordered: boolean;
}

function extractFirstList(html: string): ListMatch | null {
  const scanTag = (from: number): { tag: string; name: string; isClose: boolean; selfClosed: boolean; end: number } | null => {
    const close = html.indexOf('>', from + 1);
    if (close === -1) return null;
    const tag = html.slice(from, close + 1);
    return {
      tag,
      name: (TAG_NAME_RE.exec(tag)?.[1] ?? '').toLowerCase(),
      isClose: tag.charAt(1) === '/',
      selfClosed: /\/\s*>$/.test(tag),
      end: close + 1,
    };
  };

  // 1) 找第一个顶层 <ul>/<ol>
  let openStart = -1;
  let openEnd = -1;
  let listName = '';
  let depth = 0;
  let i = 0;
  while (i < html.length) {
    if (html.charAt(i) === '<' && /[a-zA-Z/]/.test(html.charAt(i + 1))) {
      const t = scanTag(i);
      if (t === null) break;
      if (depth === 0 && !t.isClose && (t.name === 'ul' || t.name === 'ol')) {
        openStart = i;
        openEnd = t.end;
        listName = t.name;
        break;
      }
      if (!t.isClose && !t.selfClosed && !VOID_TAGS.has(t.name)) depth += 1;
      else if (t.isClose) depth = Math.max(0, depth - 1);
      i = t.end;
      continue;
    }
    i += 1;
  }
  if (openStart === -1) return null;

  // 2) 找与之配对的闭合标签（任何闭合标签都使深度回退；退到 0 层的闭合即配对）
  let closeStart = -1;
  let closeEnd = -1;
  depth = 1;
  i = openEnd;
  while (i < html.length) {
    if (html.charAt(i) === '<' && /[a-zA-Z/]/.test(html.charAt(i + 1))) {
      const t = scanTag(i);
      if (t === null) break;
      if (t.isClose) {
        depth -= 1;
        if (depth === 0) {
          if (t.name === listName) {
            closeStart = i;
            closeEnd = t.end;
          }
          break;
        }
      } else if (!t.selfClosed && !VOID_TAGS.has(t.name)) {
        depth += 1;
      }
      i = t.end;
      continue;
    }
    i += 1;
  }
  if (closeStart === -1) return null;

  return {
    before: html.slice(0, openStart),
    after: html.slice(closeEnd),
    inner: html.slice(openEnd, closeStart),
    ordered: listName === 'ol',
  };
}

function splitListItems(listInner: string): string[] {
  const items: string[] = [];
  let depth = 0;
  let itemStart = -1;
  let i = 0;
  while (i < listInner.length) {
    if (listInner.charAt(i) === '<' && /[a-zA-Z/]/.test(listInner.charAt(i + 1))) {
      const close = listInner.indexOf('>', i + 1);
      if (close === -1) break;
      const tag = listInner.slice(i, close + 1);
      const isClose = tag.charAt(1) === '/';
      const name = (TAG_NAME_RE.exec(tag)?.[1] ?? '').toLowerCase();
      const selfClosed = /\/\s*>$/.test(tag);
      if (depth === 0 && !isClose && name === 'li') {
        itemStart = close + 1;
        depth = 1;
        i = close + 1;
        continue;
      }
      if (isClose) {
        depth -= 1;
        if (name === 'li' && itemStart !== -1 && depth <= 0) {
          items.push(listInner.slice(itemStart, i));
          itemStart = -1;
          depth = 0;
        } else if (depth < 0) {
          depth = 0;
        }
      } else if (!selfClosed && !VOID_TAGS.has(name)) {
        depth += 1;
      }
      i = close + 1;
      continue;
    }
    i += 1;
  }
  if (itemStart !== -1) items.push(listInner.slice(itemStart)); // 未闭合 li 兜底
  return items.map((item) => item.trim());
}

/** 容器开栏标题（containers.ts 已 escapeHtml）渲染为组件组的小标题 */
function headingHtml(title: string): string {
  return title !== '' ? `<div class="ce-block__heading">${title}</div>` : '';
}

/** 把 `ce-callout--<name>` 回填节重写为组件 HTML；build 返回 null 时原样保留（退化为普通容器，内容不丢） */
function rewriteCalloutSections(
  html: string,
  name: string,
  build: (title: string, body: string) => string | null,
): string {
  const re = new RegExp(`<section class="ce-callout ce-callout--${name}">([\\s\\S]*?)</section>`, 'g');
  return html.replace(re, (whole, inner: string) => {
    let rest = inner;
    let title = '';
    const titleMatch = /^<p class="ce-callout__title">([\s\S]*?)<\/p>/.exec(rest);
    if (titleMatch !== null) {
      title = titleMatch[1];
      rest = rest.slice(titleMatch[0].length);
    }
    const bodyMatch = /^<div class="ce-callout__body">([\s\S]*)<\/div>\s*$/.exec(rest.trimEnd());
    const body = bodyMatch !== null ? bodyMatch[1] : rest;
    return build(title.trim(), body) ?? whole;
  });
}

/** 从条目里取「|」分段（深度感知）；part 已 trim */
function pipeParts(item: string): string[] {
  return splitTopLevelPipes(item).map((part) => part.trim());
}

function getAttr(tag: string, name: string): string {
  const match = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i').exec(tag);
  return match !== null ? (match[1] ?? match[2] ?? '') : '';
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

/* ---------------------------------------------------------------- *
 * :::timeline —— 条目 `- 日期 | 标题 | 描述`（描述可缺省；标题段 **加粗** = 关键节点）
 * ---------------------------------------------------------------- */

const timelinePost: PostTransformer = {
  name: 'extend-timeline',
  transform(html) {
    return rewriteCalloutSections(html, 'timeline', (title, body) => {
      const list = extractFirstList(body);
      if (list === null) return null;
      const items = splitListItems(list.inner);
      if (items.length === 0) return null;
      const nodes = items
        .map((item) => {
          const parts = pipeParts(item);
          let date = '';
          let head = '';
          let desc = '';
          if (parts.length === 1) {
            head = parts[0] ?? '';
          } else {
            date = parts[0] ?? '';
            head = parts[1] ?? '';
            desc = parts.slice(2).join('|').trim();
          }
          const hot = head.includes('<strong');
          return (
            `<div class="ce-timeline__item${hot ? ' ce-timeline__item--hot' : ''}">` +
            (date !== '' ? `<div class="ce-timeline__time">${date}</div>` : '') +
            (head !== '' ? `<div class="ce-timeline__title">${head}</div>` : '') +
            (desc !== '' ? `<div class="ce-timeline__desc">${desc}</div>` : '') +
            '</div>'
          );
        })
        .join('');
      return `${headingHtml(title)}<div class="ce-timeline">${nodes}</div>`;
    });
  },
};

/* ---------------------------------------------------------------- *
 * :::stat-grid —— 条目 `- 数值 | 标签`；数值段 **加粗** = 高亮项
 * ---------------------------------------------------------------- */

const statGridPost: PostTransformer = {
  name: 'extend-stat-grid',
  transform(html) {
    return rewriteCalloutSections(html, 'stat-grid', (title, body) => {
      const list = extractFirstList(body);
      if (list === null) return null;
      const items = splitListItems(list.inner);
      if (items.length === 0) return null;
      const cells = items
        .map((item) => {
          const parts = pipeParts(item);
          const value = parts[0] ?? '';
          const label = parts.slice(1).join('|').trim();
          const hot = value.includes('<strong');
          return (
            `<div class="ce-stat${hot ? ' ce-stat--hot' : ''}">` +
            `<div class="ce-stat__value">${value}</div>` +
            (label !== '' ? `<div class="ce-stat__label">${label}</div>` : '') +
            '</div>'
          );
        })
        .join('');
      return `${headingHtml(title)}<div class="ce-stat-grid">${cells}</div>`;
    });
  },
};

/* ---------------------------------------------------------------- *
 * :::faq —— 条目 `- 问题 | 答案`；渲染为 details/summary 组
 * ---------------------------------------------------------------- */

const FAQ_CHEVRON_SVG =
  '<svg class="ce-faq__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
  'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="m6 9 6 6 6-6"/></svg>';

const faqPost: PostTransformer = {
  name: 'extend-faq',
  transform(html) {
    return rewriteCalloutSections(html, 'faq', (title, body) => {
      const list = extractFirstList(body);
      if (list === null) return null;
      const items = splitListItems(list.inner);
      if (items.length === 0) return null;
      const nodes = items
        .map((item) => {
          const parts = pipeParts(item);
          const question = parts[0] ?? '';
          const answer = parts.slice(1).join('|').trim();
          return (
            '<details class="ce-faq__item">' +
            `<summary class="ce-faq__q"><span class="ce-faq__q-text">${question}</span>${FAQ_CHEVRON_SVG}</summary>` +
            `<div class="ce-faq__a">${answer}</div>` +
            '</details>'
          );
        })
        .join('');
      return `${headingHtml(title)}<div class="ce-faq">${nodes}</div>`;
    });
  },
};

/* ---------------------------------------------------------------- *
 * :::steps —— 条目 `1. 标题 | 描述`（描述可缺省）；编号圆片 + 虚线连接
 * ---------------------------------------------------------------- */

const stepsPost: PostTransformer = {
  name: 'extend-steps',
  transform(html) {
    return rewriteCalloutSections(html, 'steps', (title, body) => {
      const list = extractFirstList(body);
      if (list === null) return null;
      const items = splitListItems(list.inner);
      if (items.length === 0) return null;
      const nodes = items
        .map((item, index) => {
          const parts = pipeParts(item);
          const head = parts[0] ?? '';
          const desc = parts.slice(1).join('|').trim();
          return (
            '<li class="ce-steps__item">' +
            `<span class="ce-steps__num">${index + 1}</span>` +
            '<div class="ce-steps__text">' +
            (head !== '' ? `<div class="ce-steps__title">${head}</div>` : '') +
            (desc !== '' ? `<div class="ce-steps__desc">${desc}</div>` : '') +
            '</div></li>'
          );
        })
        .join('');
      return `${headingHtml(title)}<ol class="ce-steps">${nodes}</ol>`;
    });
  },
};

/* ---------------------------------------------------------------- *
 * :::feature-grid —— 条目 `- 图标名 | 标题 | 描述`
 * 图标映射内置线性 SVG sprite（DESIGN-V2 §5.7 首批 10 个）；未知名回退实心圆点。
 * ---------------------------------------------------------------- */

const FEATURE_ICONS: Record<string, string> = {
  bolt: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  code: '<path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/>',
  star: '<path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>',
  mail: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="m22 6-10 7L2 6"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  terminal: '<path d="m4 17 6-6-6-6"/><path d="M12 19h8"/>',
  compass: '<circle cx="12" cy="12" r="10"/><path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"/>',
  archive: '<path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/>',
  cpu: '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3"/>',
};

function featureIconSvg(name: string): string {
  const inner = FEATURE_ICONS[name.trim().toLowerCase()];
  if (inner === undefined) {
    return '<span class="ce-feature__icon-dot" aria-hidden="true"></span>';
  }
  return (
    '<svg class="ce-feature__icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    `${inner}</svg>`
  );
}

const featureGridPost: PostTransformer = {
  name: 'extend-feature-grid',
  transform(html) {
    return rewriteCalloutSections(html, 'feature-grid', (title, body) => {
      const list = extractFirstList(body);
      if (list === null) return null;
      const items = splitListItems(list.inner);
      if (items.length === 0) return null;
      const cards = items
        .map((item) => {
          const parts = pipeParts(item);
          const icon = stripTags(parts[0] ?? '');
          const head = parts[1] ?? '';
          const desc = parts.slice(2).join('|').trim();
          return (
            '<div class="ce-feature">' +
            `<span class="ce-feature__icon">${featureIconSvg(icon)}</span>` +
            (head !== '' ? `<div class="ce-feature__title">${head}</div>` : '') +
            (desc !== '' ? `<div class="ce-feature__desc">${desc}</div>` : '') +
            '</div>'
          );
        })
        .join('');
      return `${headingHtml(title)}<div class="ce-feature-grid">${cards}</div>`;
    });
  },
};

/* ---------------------------------------------------------------- *
 * :::gallery [2|3] —— 条目 `- ![alt](地址) 说明文字`
 * 开栏数字参数 = 桌面列数（缺省 2）；非数字开栏参数作组标题。
 * 相对图片引用经 resolveContentUrl 解析为构建地址（外链与 / 绝对路径原样）。
 * ---------------------------------------------------------------- */

const galleryPost: PostTransformer = {
  name: 'extend-gallery',
  transform(html, ctx) {
    return rewriteCalloutSections(html, 'gallery', (title, body) => {
      const list = extractFirstList(body);
      if (list === null) return null;
      const items = splitListItems(list.inner);
      if (items.length === 0) return null;
      let cols = 2;
      let heading = '';
      const arg = title.trim();
      if (arg === '2' || arg === '3') {
        cols = Number(arg);
      } else if (arg !== '') {
        heading = headingHtml(arg);
      }
      const figures: string[] = [];
      for (const item of items) {
        const imgMatch = /<img\b[^>]*>/i.exec(item);
        if (imgMatch === null) continue;
        const imgTag = imgMatch[0];
        const src = getAttr(imgTag, 'src').trim();
        if (src === '') continue;
        const alt = getAttr(imgTag, 'alt');
        const resolved = resolveContentUrl(src, ctx.dir) ?? src;
        const caption = item.replace(imgTag, '').trim();
        figures.push(
          '<figure class="ce-gallery__item">' +
            `<a class="ce-gallery__link" href="${resolved}" target="_blank" rel="noopener noreferrer">` +
            `<img src="${resolved}" alt="${alt}" loading="lazy"></a>` +
            (caption !== '' ? `<figcaption class="ce-gallery__caption">${caption}</figcaption>` : '') +
            '</figure>',
        );
      }
      if (figures.length === 0) return null;
      return `${heading}<div class="ce-gallery" data-cols="${cols}">${figures.join('')}</div>`;
    });
  },
};

/* ---------------------------------------------------------------- *
 * {{kbd:A|B}} —— 行内按键（轨道 C）；围栏与行内代码内保持字面
 * ---------------------------------------------------------------- */

const KBD_TEMPLATE_RE = /\{\{\s*kbd:([^{}]*)\}\}/g;

function renderKbdTemplate(inner: string): string | null {
  const keys = inner
    .split('|')
    .map((key) => key.trim())
    .filter((key) => key !== '');
  if (keys.length === 0) return null;
  return keys
    .map((key) => `<kbd class="ce-kbd">${escapeText(key)}</kbd>`)
    .join('<span class="ce-kbd-plus">+</span>');
}

const kbdInlinePre: PreTransformer = {
  name: 'kbd-inline',
  transform(src) {
    return mapOutsideFences(src, (text) =>
      mapOutsideInlineCode(text, (part) =>
        part.replace(KBD_TEMPLATE_RE, (match, inner: string) => renderKbdTemplate(inner) ?? match),
      ),
    );
  },
};

/* ---------------------------------------------------------------- *
 * 注册（模块加载即执行；幂等 flag 防 HMR 重复注入——转换器本身亦幂等）
 * ---------------------------------------------------------------- */

const BLOCK_POSTS: PostTransformer[] = [
  timelinePost,
  statGridPost,
  faqPost,
  stepsPost,
  featureGridPost,
  galleryPost,
];

let registered = false;

/** 幂等注册全部扩展语法转换器（导出仅供测试显式调用；import 本模块即自动注册） */
export function registerExtendSyntaxTransformers(): void {
  if (registered) return;
  registered = true;
  registerPreTransformer(kbdInlinePre);
  for (const transformer of BLOCK_POSTS) {
    registerPostTransformer(transformer);
  }
}

registerExtendSyntaxTransformers();
