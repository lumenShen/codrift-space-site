/*
 * 内容系统冻结类型（docs/CONTRACTS.md §2.2，逐字保留）。
 * 修改本文件须同步修改 docs/CONTRACTS.md。
 */

export type ContentType = 'html' | 'markdown' | 'markdownWithExtend';

export interface ContentEntry {
  slug: string;
  type: ContentType;
  title: string;
  tags: string[];
  date?: string; // 'YYYY-MM-DD'
  summary?: string;
}
