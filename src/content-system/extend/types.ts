/*
 * 扩展语法管线的类型（markdownWithExtend 的转换管线，契约 §2.3 / TODO-D 的实现层）。
 *
 * 设计：管线由「pre（marked 之前跑在原始 markdown 上）」与
 * 「post（marked 之后跑在 HTML 上）」两组转换器组成，按注册顺序执行。
 * 新增语法 = 写一个 PreTransformer / PostTransformer 并 registerXxxTransformer()，
 * 不必改动渲染主流程。
 */

export interface RenderMeta {
  /** 条目 slug（诊断信息用） */
  slug: string;
  /** 条目文件在 src/content 下的目录（如 `post`），供未来相对资产解析 */
  dir: string;
}

export interface RenderContext extends RenderMeta {
  /** 容器占位注释 → 最终 HTML 的暂存区（restore 阶段回填） */
  stash: Map<string, string>;
  /** 生成唯一占位 id */
  nextId: () => string;
  /** 递归入口：对一段 markdown 走完整管线（容器内嵌套内容用） */
  render: (src: string) => string;
}

export interface PreTransformer {
  name: string;
  /** 输入/输出都是 markdown 原文。实现必须对代码块（围栏、行内）保持原样。 */
  transform(src: string, ctx: RenderContext): string;
}

export interface PostTransformer {
  name: string;
  /** 输入/输出都是 marked 产出的 HTML。 */
  transform(html: string, ctx: RenderContext): string;
}
