/*
 * 行内扩展模板：{{tag:xxx}} / {{badge:文本|variant}} / {{link:url|标题|描述}}。
 *
 * - {{tag:xxx}}   → 标签徽章链接，跳到博客页对应标签筛选（hash 路由：#/blog?tag=xxx）。
 *                   约定：BlogListPage 读取 route.query.tag 作为筛选值（见 notes/集成说明）。
 * - {{badge:...}} → 徽章；variant ∈ accent（默认）/ warn / tip / muted。
 * - {{link:...}}  → 链接卡；url 仅接受 http(s) 或站内绝对路径，其余原样保留。
 *
 * 未知前名的 {{...}} 一律原样保留，不破坏普通文本（例如 Vue 模板示例）。
 */

import { escapeHtml } from './escape';
import { mapOutsideFences, mapOutsideInlineCode } from './scanner';
import type { PreTransformer } from './types';

const TEMPLATE_RE = /\{\{([^{}]+)\}\}/g;

const BADGE_VARIANTS = new Set(['accent', 'warn', 'tip', 'muted']);

/** 标签 → 博客页 hash 路由地址（配合 vue-router 的 createWebHashHistory） */
export function buildTagHref(tag: string): string {
  return `#/blog?tag=${encodeURIComponent(tag)}`;
}

function renderTemplate(rawInner: string): string | null {
  const parts = rawInner.split('|').map((part) => part.trim());
  const head = parts[0] ?? '';
  const colonIndex = head.indexOf(':');
  if (colonIndex <= 0) return null;
  const kind = head.slice(0, colonIndex).trim();
  const rest = head.slice(colonIndex + 1).trim();

  if (kind === 'tag') {
    if (rest === '') return null;
    return `<a class="ce-tag" href="${buildTagHref(rest)}">#${escapeHtml(rest)}</a>`;
  }

  if (kind === 'badge') {
    if (rest === '') return null;
    const variantRaw = (parts[1] ?? '').toLowerCase();
    const variant = BADGE_VARIANTS.has(variantRaw) ? variantRaw : 'accent';
    return `<span class="ce-badge ce-badge--${variant}">${escapeHtml(rest)}</span>`;
  }

  if (kind === 'link') {
    const url = rest;
    if (!/^(https?:\/\/|\/)/i.test(url)) return null;
    const title = parts[1] ?? '';
    const desc = parts.slice(2).join('|').trim();
    const isAbsolute = /^https?:\/\//i.test(url);
    let host = '';
    if (isAbsolute) {
      try {
        host = new URL(url).hostname;
      } catch {
        host = '';
      }
    }
    const titleText = title !== '' ? title : url;
    const descHtml = desc !== '' ? `<span class="ce-linkcard__desc">${escapeHtml(desc)}</span>` : '';
    const hostHtml = host !== '' ? `<span class="ce-linkcard__host">${escapeHtml(host)}</span>` : '';
    return (
      `<a class="ce-linkcard" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">` +
      `<span class="ce-linkcard__body"><span class="ce-linkcard__title">${escapeHtml(titleText)}</span>${descHtml}</span>${hostHtml}` +
      '</a>'
    );
  }

  return null; // 未知模板：原样保留
}

export const inlineTemplatesPre: PreTransformer = {
  name: 'inline-templates',
  transform(src) {
    return mapOutsideFences(src, (text) =>
      mapOutsideInlineCode(text, (part) =>
        part.replace(TEMPLATE_RE, (match, inner: string) => renderTemplate(inner) ?? match),
      ),
    );
  },
};
