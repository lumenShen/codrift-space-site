/*
 * 首页板块的类型定义。
 * RepoItem 与 HomePage 的 Repo 保持结构一致（页面侧只做透传，不复制数据）。
 */

export interface RepoItem {
  name: string;
  url: string;
  description: string;
  language?: string;
  stars?: number;
  flagship?: boolean;
  /** 站内路由（如知识笔记专区），渲染为 RouterLink */
  internal?: boolean;
  badge?: string;
  /** 需要被一眼看到的一句话 */
  highlight?: string;
  featured?: boolean;
  /** 进入作品集横向轨道并展示截图；缺省时收进下方「还有」一行 */
  showcase?: boolean;
  /** 卡片截图（public 下的路径） */
  image?: string;
  imageAlt?: string;
  /** 截图裁剪焦点（object-position），默认 center */
  imagePosition?: string;
  /** 卡片正文的粗体引子（默认取项目名） */
  lead?: string;
  /** 卡片底部的技术栈 / 规格行 */
  stack?: string;
}
