/*
 * :::note / :::warn / :::tip 容器语法。
 *
 * 语法（独立行）：
 *   :::note 可选标题
 *   内部任意 markdown（可嵌套容器、代码块等）
 *   :::
 *
 * 实现说明：pre 阶段把容器整体抽取出来，内部 markdown 经 ctx.render 递归渲染，
 * 再以单行占位注释 `<!--ce-callout:<id>-->` 留在原文里；post 阶段用暂存的 HTML 回填。
 * 不直接往 markdown 里插大段 HTML 的原因：commonmark 的 HTML 块在「空行」处截断，
 * 容器内部一旦出现空行（例如代码块）就会被 marked 拆散。占位注释是单行 HTML 注释块，
 * marked 原样透传，最稳。
 */

import { escapeHtml } from './escape';
import { mapOutsideFences } from './scanner';
import type { PostTransformer, PreTransformer } from './types';

const PLACEHOLDER_RE = /<!--\s*ce-callout:([\w-]+)\s*-->/g;

interface CalloutFrame {
  type: string;
  title: string;
  inner: string[];
}

function sanitizeType(type: string): string {
  const cleaned = type.replace(/[^\w-]/g, '');
  return cleaned !== '' ? cleaned : 'note';
}

function extractCallouts(text: string, ctx: Parameters<PreTransformer['transform']>[1]): string {
  const lines = text.split('\n');
  const out: string[] = [];
  const stack: CalloutFrame[] = [];

  const closeTop = () => {
    const frame = stack.pop();
    if (frame === undefined) return;
    const innerHtml = ctx.render(frame.inner.join('\n'));
    const id = ctx.nextId();
    const titleHtml =
      frame.title !== ''
        ? `<p class="ce-callout__title">${escapeHtml(frame.title)}</p>`
        : '';
    ctx.stash.set(
      id,
      `<section class="ce-callout ce-callout--${sanitizeType(frame.type)}">${titleHtml}<div class="ce-callout__body">${innerHtml}</div></section>`,
    );
    const target = stack.length > 0 ? stack[stack.length - 1].inner : out;
    target.push('', `<!--ce-callout:${id}-->`, '');
  };

  for (const line of lines) {
    if (/^:::[ \t]*$/.test(line)) {
      if (stack.length > 0) closeTop();
      else out.push(line); // 无开栏的孤立 `:::` 原样保留
      continue;
    }
    const openMatch = /^:::([A-Za-z0-9_-]+)(?:[ \t]+(.*?))?[ \t]*$/.exec(line);
    if (openMatch) {
      stack.push({ type: openMatch[1], title: (openMatch[2] ?? '').trim(), inner: [] });
      continue;
    }
    const target = stack.length > 0 ? stack[stack.length - 1].inner : out;
    target.push(line);
  }
  while (stack.length > 0) closeTop(); // 未闭合容器兜底，避免内容丢失
  return out.join('\n');
}

export const calloutContainersPre: PreTransformer = {
  name: 'callout-containers',
  transform(src, ctx) {
    return mapOutsideFences(src, (text) => extractCallouts(text, ctx));
  },
};

export const calloutRestorePost: PostTransformer = {
  name: 'callout-restore',
  transform(html, ctx) {
    return html.replace(PLACEHOLDER_RE, (_match, id: string) => ctx.stash.get(id) ?? '');
  },
};
