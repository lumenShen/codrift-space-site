/*
 * 内容系统公共出口。页面模块（契约 §4/§5）只允许从这里 import，
 * 不得深入本目录内部文件。
 *
 * 冻结 API（docs/CONTRACTS.md §2.2/§2.3）：ContentEntry/ContentType、
 * getAllEntries/getEntryBySlug/getEntriesByTag/getAllTags、renderEntry、registerExtendComponent。
 * 以下是契约外的补充导出（不改冻结面，方便页面侧复用，详见集成说明）：
 * - buildTagHref：{{tag:xxx}} 所用的「标签 → 博客页 hash 路由」地址约定；
 * - registerPreTransformer / registerPostTransformer + 类型：markdownWithExtend 管线的扩展点；
 * - mapOutsideFences / mapOutsideInlineCode：代码感知扫描器（自定义行内 PreTransformer 用，
 *   先例见 buildTagHref 的「契约外补充导出」机制）；
 * - resolveContentUrl：内容资产相对引用 → 构建后 URL（gallery 等组件解析图片用）；
 * - styles/content.css：markdown 排版与扩展组件样式，随本模块引入。
 */

import './styles/content.css';

export type { ContentEntry, ContentType } from './types';
export { getAllEntries, getAllTags, getEntriesByTag, getEntryBySlug } from './registry';
export { registerExtendComponent, renderEntry } from './render';
export { buildTagHref } from './extend/inline';
export { registerPostTransformer, registerPreTransformer } from './extend/pipeline';
export type { PostTransformer, PreTransformer } from './extend/types';
export { mapOutsideFences, mapOutsideInlineCode } from './extend/scanner';
export { resolveContentUrl } from './extend/htmlFrame';
