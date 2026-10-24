/*
 * 渲染入口（docs/CONTRACTS.md §2.3 冻结 API）。
 *
 * renderEntry(entry) → 可直接挂载的 Vue 组件：
 *   <component :is="renderEntry(entry)" />
 *
 * 三种类型的渲染：
 * - html：正文以 iframe srcdoc + sandbox 隔离渲染（选型理由见本目录 htmlFrame.ts 头注释）；
 * - markdown：marked 渲染 → .ce-markdown 排版样式（styles/content.css）；
 * - markdownWithExtend：扩展语法管线（extend/pipeline.ts）渲染后，按独立行占位注释
 *   `<!-- extend:组件名 -->` 切分为「HTML 段 + 注册组件」的组合。
 *
 * extend 组件注册制：页面工程师在 src/components/extend/** 实现组件后调用
 * registerExtendComponent(name, component)；注册前后渲染均安全（未注册显示占位，
 * reactive 注册表保证晚注册也会触发重渲染）。内容系统不反向 import 页面代码。
 */

import { defineComponent, h, markRaw, reactive } from 'vue';
import type { Component, VNode } from 'vue';
import { buildHtmlFrameDocument, createHtmlFrame } from './extend/htmlFrame';
import { renderExtendedMarkdown, renderMarkdownDoc } from './extend/pipeline';
import { getEntrySource } from './registry';
import type { ContentEntry } from './types';

/** extend 组件注册表；reactive 使「渲染后才注册」的组件也能补挂上 */
const extendRegistry = reactive(new Map<string, Component>());

/** 注册 extend 组件（冻结 API）：`<!-- extend:Name -->` 中的 Name 对应此处的 name */
export function registerExtendComponent(name: string, component: Component): void {
  if (import.meta.env.DEV && !/^[A-Za-z0-9_-]+$/.test(name)) {
    console.warn(`[content-system] extend 组件名建议仅含字母/数字/下划线/连字符：${name}`);
  }
  // markRaw：注册表是 reactive Map，组件对象本身不应被代理（Vue 会告警且开销无谓）
  extendRegistry.set(name, markRaw(component));
}

type Segment = { kind: 'html'; html: string } | { kind: 'extend'; name: string };

const EXTEND_COMMENT_RE = /<!--\s*extend:([A-Za-z0-9_-]+)\s*-->/g;

/** 把管线产出的 HTML 按 extend 占位注释切分（代码块里的注释已被转义，不会误切） */
function splitExtendSegments(html: string): Segment[] {
  const segments: Segment[] = [];
  let last = 0;
  const pushHtml = (chunk: string) => {
    if (chunk.trim() !== '') segments.push({ kind: 'html', html: chunk });
  };
  for (const match of html.matchAll(EXTEND_COMMENT_RE)) {
    const start = match.index ?? 0;
    pushHtml(html.slice(last, start));
    segments.push({ kind: 'extend', name: match[1] });
    last = start + match[0].length;
  }
  pushHtml(html.slice(last));
  return segments;
}

function renderExtendNode(name: string, key: string): VNode {
  const component = extendRegistry.get(name);
  if (component !== undefined) return h(component, { key });
  return h('div', { key, class: 'ce-extend-missing' }, `extend 组件未注册：${name}`);
}

function createSegmentsComponent(slug: string, segments: Segment[]): Component {
  return defineComponent({
    name: `Content_${slug}`,
    setup() {
      return () =>
        h(
          'div',
          { class: 'ce-content' },
          segments.map((segment, index): VNode => {
            const key = `seg-${index}`;
            if (segment.kind === 'html') {
              return h('div', { key, class: 'ce-markdown', innerHTML: segment.html });
            }
            return renderExtendNode(segment.name, key);
          }),
        );
    },
  });
}

function createMissingComponent(slug: string): Component {
  return defineComponent({
    name: 'ContentMissing',
    setup() {
      return () =>
        h('div', { class: 'ce-content' }, [
          h('div', { class: 'ce-extend-missing' }, `内容缺失：${slug}`),
        ]);
    },
  });
}

const COMPONENT_CACHE = new Map<string, Component>();

/** 渲染入口（冻结 API）：输入条目，返回可直接挂载的组件 */
export function renderEntry(entry: ContentEntry): Component {
  const cached = COMPONENT_CACHE.get(entry.slug);
  if (cached !== undefined) return cached;

  const source = getEntrySource(entry.slug);
  let component: Component;
  if (source === undefined) {
    if (import.meta.env.DEV) {
      console.warn(`[content-system] renderEntry：registry 中没有条目原文 ${entry.slug}`);
    }
    component = createMissingComponent(entry.slug);
  } else {
    switch (entry.type) {
      case 'html': {
        const { srcdoc, missing } = buildHtmlFrameDocument(source.body, source.dir);
        if (missing.length > 0 && import.meta.env.DEV) {
          console.warn(`[content-system] html 条目 ${entry.slug} 有未解析到的资产引用：${missing.join(', ')}`);
        }
        component = createHtmlFrame(srcdoc, entry.title);
        break;
      }
      case 'markdown': {
        component = createSegmentsComponent(entry.slug, [
          { kind: 'html', html: renderMarkdownDoc(source.body) },
        ]);
        break;
      }
      case 'markdownWithExtend': {
        const html = renderExtendedMarkdown(source.body, { slug: entry.slug, dir: source.dir });
        component = createSegmentsComponent(entry.slug, splitExtendSegments(html));
        break;
      }
    }
  }

  COMPONENT_CACHE.set(entry.slug, component);
  return component;
}
