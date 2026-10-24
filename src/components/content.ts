/*
 * 页面侧的内容选材与渲染辅助 —— 页面模块对内容系统（§2 冻结 API）的唯一消费入口。
 * 只 import '@/content-system' 的桶导出（契约 §4：不得 import 对方内部文件）。
 *
 * 选材约定（与 docs/CONTRACTS.md 及工作流分工一致）：
 *   - tag 'home'  → 首页板块正文（about / contact 及其余板块）；
 *   - tag 'post'  → 博客文章；
 *   - 博客列表取「不带 'home' 标签的条目」，兼容 html 示例等未打 'post' 的演示条目。
 */
import type { Component } from 'vue';
import type { ContentEntry } from '@/content-system';
import {
  getAllEntries,
  getEntriesByTag,
  registerExtendComponent,
  renderEntry,
} from '@/content-system';
import TagLink from './extend/TagLink.vue';
import TagCloud from './extend/TagCloud.vue';

/* ---------------------------------------------------------------- *
 * extend 组件注册（契约 §2.3：本体在页面侧，注册制）。
 * 独立行占位 `<!-- extend:Name -->` 由内容系统切分并替换为注册组件：
 *   - 'TagCloud'：全站标签一览（src/content/home/about.extend.md:14 占位）；
 *   - {{tag:xxx}} / 徽章 / 链接卡等内联扩展由内容系统直接渲染为 HTML（不走
 *     extend 注册表），TagLink 为其预留的独立组件形态，按别名注册备用。
 * 若内容侧占位名变化，集成时只需改下面的注册行。
 * ---------------------------------------------------------------- */
const EXTEND_ALIASES = ['tag', 'Tag', 'tagLink', 'TagLink', 'TagChip', 'tag-chip'] as const;

let extendRegistered = false;

/** 幂等注册 extend 组件；内容系统未就绪时降级为告警，不让页面崩掉。 */
export function ensureExtendComponentsRegistered(): void {
  if (extendRegistered) return;
  extendRegistered = true;
  try {
    for (const name of EXTEND_ALIASES) {
      registerExtendComponent(name, TagLink);
    }
    registerExtendComponent('TagCloud', TagCloud);
  } catch (err) {
    // 契约冻结了 registerExtendComponent；走到这里说明对方实现有偏差，
    // 保留现场信息交由集成工程师对齐，页面本身不中断。
    console.warn('[codrift] registerExtendComponent 注册失败：', err);
  }
}

/* ---------------------------------------------------------------- *
 * 渲染缓存：renderEntry 每次调用都新建组件，按 entry 记忆化，
 * 避免路由复用/重渲染时组件身份抖动。
 * ---------------------------------------------------------------- */
const renderedCache = new WeakMap<ContentEntry, Component>();

export function renderedEntry(entry: ContentEntry): Component {
  let comp = renderedCache.get(entry);
  if (!comp) {
    comp = renderEntry(entry);
    renderedCache.set(entry, comp);
  }
  return comp;
}

/* ---------------------------------------------------------------- *
 * 选材：博客条目（列表页 + 首页速览共用）
 * ---------------------------------------------------------------- */
export function selectBlogEntries(): ContentEntry[] {
  const posts = getEntriesByTag('post');
  if (posts.length > 0) return posts;
  // 内容侧尚未打 'post' 标签时，退化为「全部非首页条目」，
  // 保证 html 示例等演示条目仍可从列表进入。
  return getAllEntries().filter((e) => !e.tags.includes('home'));
}

export function selectLatestPosts(count: number): ContentEntry[] {
  return selectBlogEntries().slice(0, count);
}

/* ---------------------------------------------------------------- *
 * 选材：首页板块（ask 指定顺序：关于我 → 联系方式 → 其余 home 板块）
 * 作品集 / 博客速览两个板块是数据/列表型，不走内容条目，由页面自行组织。
 * ---------------------------------------------------------------- */
export interface HomeSection {
  /** 稳定 id：默认展开态等以此判断（'about' 默认展开） */
  id: string;
  title: string;
  entry: ContentEntry;
}

export function selectHomeSections(): HomeSection[] {
  const home = getEntriesByTag('home');
  const pick = (slug: string, pattern: RegExp): ContentEntry | undefined =>
    home.find((e) => e.slug === slug) ?? home.find((e) => pattern.test(e.slug));

  const about = pick('about', /about|bio|关于/i);
  const contact = pick('contact', /contact|联系/i);
  const rest = home.filter((e) => e !== about && e !== contact);

  const sections: HomeSection[] = [];
  if (about) sections.push({ id: 'about', title: about.title, entry: about });
  if (contact) sections.push({ id: 'contact', title: contact.title, entry: contact });
  for (const e of rest) {
    sections.push({ id: e.slug, title: e.title, entry: e });
  }
  return sections;
}
