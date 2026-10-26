import type { NoteCollection } from '@/data/notes';

/*
 * 封面版式的公共取数与调色板。
 *
 * 封面是「印刷物」，配色不跟随站点主题：底色与墨色是纸面自身的一部分，
 * 只有强调色按笔记种类区分（蓝＝正课、绿＝复习、橙＝C 语言工程、紫＝C++ 语言工程），
 * 使四本并排时像同一套丛书的分册。
 */
export const COVER_VARIANTS = ['editorial', 'nocturne', 'index', 'swiss', 'spine'] as const;

export type CoverVariant = (typeof COVER_VARIANTS)[number];

const ACCENTS: Record<string, string> = {
  gaoshu: '#4f8cff',
  'gaoshu-review': '#46e2a0',
  'c-engineering': '#ff9a4d',
  'cpp-engineering': '#a78bfa',
};

const GLYPHS: Record<string, string> = {
  gaoshu: '∫',
  'gaoshu-review': 'ε',
  'c-engineering': '{ }',
  'cpp-engineering': '++',
};

/** 每本笔记的默认版式：站点内实际展示的那一套（站长选定「夜读极光」） */
const DEFAULT_VARIANTS: Record<string, CoverVariant> = {
  gaoshu: 'nocturne',
  'gaoshu-review': 'nocturne',
  'c-engineering': 'nocturne',
  'cpp-engineering': 'nocturne',
};

export function coverAccent(collection: NoteCollection): string {
  return ACCENTS[collection.id] ?? 'var(--accent)';
}

export function coverGlyph(collection: NoteCollection): string {
  return GLYPHS[collection.id] ?? '§';
}

export function defaultCoverVariant(collection: NoteCollection): CoverVariant {
  return DEFAULT_VARIANTS[collection.id] ?? 'editorial';
}

/** 01 / 02 / 03：丛书里的分册序号 */
export function coverNo(index: number): string {
  return String(index + 1).padStart(2, '0');
}

/** 把「高等数学 · 正课」拆成主标题与副标题两行 */
export function coverTitleLines(collection: NoteCollection): { main: string; sub: string } {
  const [main, ...rest] = collection.title.split('·').map((part) => part.trim());
  return { main: main || collection.title, sub: rest.join(' · ') };
}

/** 封面底部的一行章节索引（默认取前两章，过长由 CSS 截断） */
export function coverChapterLine(collection: NoteCollection, count = 2): string {
  return collection.chapters
    .slice(0, count)
    .map((chapter) => chapter.title)
    .join(' / ');
}
