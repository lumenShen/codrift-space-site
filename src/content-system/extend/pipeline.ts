/*
 * markdownWithExtend 渲染管线（可扩展转换管线）。
 *
 * 流程：pre 转换器（逐个跑在原始 markdown 上）→ marked 渲染 → post 转换器（跑在 HTML 上）。
 * 内置：:::note/warn/tip 容器（containers.ts）、行内模板 {{tag}}/{{badge}}/{{link}}（inline.ts）。
 * 新语法：实现 PreTransformer / PostTransformer 后调用 registerPreTransformer /
 * registerPostTransformer 注册即可，无需改渲染主流程。
 *
 * `<!-- extend:组件名 -->` 占位注释不经本管线特殊处理：marked 对单行 HTML 注释原样透传，
 * 由 render.ts 在组件层切分为「HTML 段 + 动态组件」。
 */

import { Marked } from 'marked';
import { calloutContainersPre, calloutRestorePost } from './containers';
import { inlineTemplatesPre } from './inline';
import type { PreTransformer, PostTransformer, RenderContext, RenderMeta } from './types';

const mdRenderer = new Marked({ gfm: true, breaks: false });

/** 纯 markdown 渲染（不带扩展语法），供 `markdown` 类型使用 */
export function renderMarkdownDoc(src: string): string {
  return mdRenderer.parse(src, { async: false });
}

const preTransformers: PreTransformer[] = [calloutContainersPre, inlineTemplatesPre];
const postTransformers: PostTransformer[] = [calloutRestorePost];

/** 注册一个 marked 之前的转换器（新语法扩展点；追加到管线末尾） */
export function registerPreTransformer(transformer: PreTransformer): void {
  preTransformers.push(transformer);
}

/** 注册一个 marked 之后的转换器（新语法扩展点；追加到管线末尾） */
export function registerPostTransformer(transformer: PostTransformer): void {
  postTransformers.push(transformer);
}

function createContext(meta: RenderMeta): RenderContext {
  let counter = 0;
  const ctx: RenderContext = {
    ...meta,
    stash: new Map(),
    nextId: () => `c${(++counter).toString(36)}`,
    render: (src: string) => renderExtendedMarkdown(src, meta, ctx),
  };
  return ctx;
}

/**
 * 渲染 markdownWithExtend 正文：markdown + 扩展语法。
 * existing 供递归复用同一上下文（暂存区/计数器），外部调用方不传。
 */
export function renderExtendedMarkdown(
  src: string,
  meta: RenderMeta,
  existing?: RenderContext,
): string {
  const ctx = existing ?? createContext(meta);
  let out = src;
  for (const transformer of preTransformers) {
    out = transformer.transform(out, ctx);
  }
  let html = renderMarkdownDoc(out);
  for (const transformer of postTransformers) {
    html = transformer.transform(html, ctx);
  }
  return html;
}
