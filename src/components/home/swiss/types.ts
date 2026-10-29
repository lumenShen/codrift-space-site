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
}
