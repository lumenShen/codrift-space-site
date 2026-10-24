/*
 * registry —— 内容条目收集与查询（docs/CONTRACTS.md §2.3 冻结 API）。
 *
 * 数据来源：Vite `import.meta.glob` 按 `?raw` 全量收集 src/content 下的条目文件。
 * 注意 glob 模式相对导入文件解析：本文件位于 src/content-system/，故写 `../content/**`。
 * type 由扩展名决定（§2.1）：`.html` → html；`.md` → markdown；`.extend.md` → markdownWithExtend。
 * slug = 文件名去扩展名（`.extend.md` 去掉 `.extend.md`），全站唯一，即路由 `:slug`。
 */

import type { ContentEntry, ContentType } from './types';
import { parseFrontmatter } from './frontmatter';

interface EntrySource {
  entry: ContentEntry;
  /** 去掉 frontmatter 后的正文原文 */
  body: string;
  /** 条目文件在 src/content 下的目录（如 `home`、`post`、`demo`），供相对资产解析 */
  dir: string;
}

const RAW_MODULES = import.meta.glob('../content/**/*.{html,md}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function typeFromFilename(filename: string): { type: ContentType; slug: string } | null {
  if (filename.endsWith('.extend.md')) return { type: 'markdownWithExtend', slug: filename.slice(0, -'.extend.md'.length) };
  if (filename.endsWith('.md')) return { type: 'markdown', slug: filename.slice(0, -'.md'.length) };
  if (filename.endsWith('.html')) return { type: 'html', slug: filename.slice(0, -'.html'.length) };
  return null;
}

function buildEntry(contentRelPath: string, raw: string): EntrySource | null {
  // contentRelPath 形如 `home/about.extend.md`
  const segments = contentRelPath.split('/');
  const filename = segments[segments.length - 1];
  const dir = segments.slice(0, -1).join('/');
  const parsed = typeFromFilename(filename);
  if (!parsed) return null;

  const { data, body } = parseFrontmatter(raw);
  const title = typeof data.title === 'string' ? data.title : '';
  const tags = Array.isArray(data.tags) ? data.tags : [];
  if (title === '' || tags.length === 0) {
    if (import.meta.env.DEV) {
      console.warn(`[content-system] 条目被跳过（title/tags 必填）：${contentRelPath}`);
    }
    return null;
  }

  const entry: ContentEntry = {
    slug: parsed.slug,
    type: parsed.type,
    title,
    tags,
  };
  const date = typeof data.date === 'string' ? data.date : '';
  if (date !== '') entry.date = date;
  const summary = typeof data.summary === 'string' ? data.summary : '';
  if (summary !== '') entry.summary = summary;

  return { entry, body, dir };
}

function dateDesc(a: ContentEntry, b: ContentEntry): number {
  // 按 date 降序；无 date 的排最后（冻结规则）
  if (a.date && b.date) return a.date === b.date ? a.slug.localeCompare(b.slug) : a.date < b.date ? 1 : -1;
  if (a.date) return -1;
  if (b.date) return 1;
  return a.slug.localeCompare(b.slug);
}

function collect(): { sorted: ContentEntry[]; sources: Map<string, EntrySource> } {
  const sources = new Map<string, EntrySource>();
  for (const [key, raw] of Object.entries(RAW_MODULES)) {
    const prefix = '../content/';
    if (!key.startsWith(prefix)) continue;
    const source = buildEntry(key.slice(prefix.length), raw);
    if (!source) continue;
    const existing = sources.get(source.entry.slug);
    if (existing) {
      if (import.meta.env.DEV) {
        console.warn(`[content-system] slug 冲突（全站唯一）：${source.entry.slug} —— ${key} 与既有条目冲突，后者被忽略`);
      }
      continue;
    }
    sources.set(source.entry.slug, source);
  }
  const sorted = [...sources.values()].map((s) => s.entry).sort(dateDesc);
  return { sorted, sources };
}

const { sorted: SORTED_ENTRIES, sources: SOURCES } = collect();

/** 全部条目，按 date 降序，无 date 排最后（冻结） */
export function getAllEntries(): ContentEntry[] {
  return [...SORTED_ENTRIES];
}

/** 按 slug 取条目（冻结） */
export function getEntryBySlug(slug: string): ContentEntry | undefined {
  return SOURCES.get(slug)?.entry;
}

/** 按 tag 查询（大小写敏感，按 getAllEntries 顺序；冻结） */
export function getEntriesByTag(tag: string): ContentEntry[] {
  return SORTED_ENTRIES.filter((entry) => entry.tags.includes(tag));
}

/** 去重后的 tag 列表（按 getAllEntries 顺序首次出现排列；冻结） */
export function getAllTags(): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const entry of SORTED_ENTRIES) {
    for (const tag of entry.tags) {
      if (!seen.has(tag)) {
        seen.add(tag);
        tags.push(tag);
      }
    }
  }
  return tags;
}

/** 内部使用：取条目原文（正文）与其所在目录，供 render.ts 渲染用。非冻结 API，页面不得依赖。 */
export function getEntrySource(slug: string): EntrySource | undefined {
  return SOURCES.get(slug);
}
