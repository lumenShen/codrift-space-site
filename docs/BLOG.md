# docs/BLOG.md — Codrift 发文指南

> 内容文件的**权威规范**是 `docs/CONTRACTS.md` §2（内容系统契约）；本文是面向写作者的
> 操作手册。两者冲突时以 CONTRACTS.md 为准并回改本文。

站点博客内容全部来自 `src/content/**`，每篇文章一个文件。有两种发文方式：

| 方式 | 适合 | 流程 | 上线 |
| --- | --- | --- | --- |
| ① 本地放 md 文件 | 日常写作、需要精修排版 | 写文件 → push 到 `main` | push 自动触发 `deploy.yml` |
| ② 开 issue 打 blog 标签 | 手机上随手发、快速记录 | 开 issue（标题+正文）→ 打 `blog` 标签 | 管线自动提交文章，但**部署需手动触发**（见 §4 已知限制） |

---

## 1. 文件放在哪、叫什么

- 目录：`src/content/<分组>/<slug>.<ext>`。博客文章约定分组为 `posts/`（issue 管线固定写到 `src/content/posts/`）。
- **slug = 文件名去扩展名**（`.extend.md` 则去掉 `.extend.md`），全站唯一，同时是路由 `/:slug`。
- 文件名建议带日期前缀便于排序：`2026-10-24-my-first-post.md`（issue 管线的固定格式为 `<YYYY-MM-DD>-<标题slug>-<issue号>.md`，日期取 issue 创建日）。

## 2. frontmatter 规范

文件头用 `---` 包裹的 YAML：

```markdown
---
title: "用 Vue 3 搭一个玻璃质感的个人站"
tags: ["post", "vue"]
date: "2026-10-24"
summary: "从脚手架到部署的完整记录。"
---

正文从这里开始……
```

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `title` | ✅ | 文章标题，建议加引号（含冒号等特殊字符时必须加） |
| `tags` | ✅ | 字符串数组，见 §3 标签约定 |
| `date` | ⬜ | `YYYY-MM-DD`；列表页按 date 降序，缺省排最后 |
| `summary` | ⬜ | 摘要文案 |
| `type` | ⬜ | **由扩展名决定**：`.md` → `markdown`、`.html` → `html`、`.extend.md` → `markdownWithExtend`。issue 管线会冗余写 `type: markdown`，手写时可省略 |

## 3. 标签约定

- `post` —— 博客文章**必带**（issue 管线自动加上；手写请记得写）。
- `home` —— 首页精选展示位。
- 其余自由标签（`vue`、`design`、`diary`……），全小写、不带空格；列表页可按 tag 检索（`getEntriesByTag`，大小写敏感）。
- issue 管线中，`blog` 是触发标签**不会**进入文章 tags；issue 上的其它标签会原样并入。

## 4. 方式②：开 issue 发文（自动管线）

1. 仓库 Issues → New issue，**标题 = 文章标题**，**正文 = markdown 正文**（可完整使用 extend 语法）。
2. 右侧 Labels 勾选 `blog`（可再加其它标签，它们会成为文章 tags）。
3. `.github/workflows/blog.yml` 触发：`scripts/issue-to-post.mjs` 经 GitHub API 读取标题/正文/标签，
   生成 `src/content/posts/<创建日期>-<标题slug>-<issue号>.md` 并以 `github-actions[bot]` 身份 commit + push 回 `main`。
4. **幂等**：编辑 issue（改标题/正文/标签）会再次触发并**覆盖同一篇文章**（同一 issue 永远对应同一文件；若标题改动导致文件名变化，旧文件会被删除）。

⚠️ **已知限制**：管线用仓库自带 `GITHUB_TOKEN` 推送的 commit **不会**触发 `deploy.yml` 的
`on: push`（GitHub 官方规则）。issue 发文后，请到 Actions 页手动对 **Deploy to GitHub Pages**
点 "Run workflow"；或按 `scripts/issue-to-post.mjs` 文件头注释的三种方案改造（PAT / API dispatch / 并入部署）。

## 5. 扩展语法（`markdownWithExtend`）

扩展名用 `.extend.md` 才有扩展语法；`.md` 走纯 markdown。扩展语法分三类：

### 5.1 独立占位组件（`<!-- extend:Name -->`）

正文中写**独立一行**的占位注释，渲染时会被替换成已注册的 Vue 组件：

```markdown
---
title: "三条动态演示"
tags: ["post", "demo"]
---

先写普通段落。

<!-- extend:GlassDemo -->

再继续写普通段落。占位注释必须独占一行。
```

- `GlassDemo` 这类组件由页面工程师放在 `src/components/extend/**` 并调用
  `registerExtendComponent(name, component)` 注册（契约 §2.3）；写了未注册的组件名，该行按原样显示。
- 手写文章想用哪个 extend 组件，先在 `src/components/extend/` 里确认组件已注册，再用其注册名。
- 现有：`TagCloud`（全站标签一览）。这类组件自取数据、不包裹正文。

### 5.2 块级容器组件（`:::` 语法，六件套）

`:::名字 … :::` 开合（都独立成行）的容器，内部条目按「`-` 列表项 + 半角竖线 `|` 分段」书写。
内部 markdown 会正常渲染，所以条目里可以继续用 `{{badge}}`、`{{tag}}`、`{{kbd}}`、链接等行内语法。
六种（开栏名字后的可选文字=组标题，`gallery` 例外=列数参数）：

| 组件 | 条目格式 | 说明 |
| --- | --- | --- |
| `:::timeline` | `- 日期 \| 标题 \| 描述` | 描述可缺省；标题段用 `**加粗**` 包裹即为关键节点（实心圆点+外环） |
| `:::stat-grid` | `- 数值 \| 标签` | 数值段 `**加粗**` 即高亮项（一屏最多一个） |
| `:::faq` | `- 问题 \| 答案` | 答案含行内 markdown；渲染为可展开的 `<details>` |
| `:::steps` | `1. 标题 \| 描述` | 有序列表，自动编号圆片+虚线连接；描述可缺省 |
| `:::feature-grid` | `- 图标名 \| 标题 \| 描述` | 图标名 ∈ bolt/book/code/star/mail/link/terminal/compass/archive/cpu，未知名回退圆点 |
| `:::gallery [2\|3]` | `- ![alt](地址) 说明文字` | 开栏数字=桌面列数（缺省 2，<768px 恒单列）；说明文字可缺省；相对地址会解析到 `src/content` 资产，`/` 绝对路径与外链原样；点击新窗看原图 |

示例：

```markdown
:::timeline
- 2026-10-20 | 第一篇文章 | Hello, Codrift
- 2026-10-24 | **扩展语法上线** | 本文即验收现场
:::
```

**约束与注意**：

- 条目以「深度为 0 的 `|`」分段——行内代码里的 `|`（如 `` `a|b` ``）不会误切；正文里要写字面竖线请用 `&#124;`。
- **具名容器（上表六种）内不得再嵌套 `:::` 容器**，嵌套属未定义行为；`:::note/warn/tip` 容器不受此限。
- 容器内没有可解析的条目列表时，整块按普通提示容器呈现，内容不丢。

### 5.3 行内按键（`{{kbd:A|B}}`）

```markdown
按 {{kbd:Ctrl|K}} 打开命令面板，{{kbd:Esc}} 关闭。
```

渲染为键帽样式，多键用 `|` 分隔自动补 `+`。对围栏代码块与行内代码保持字面文本
（想演示语法本身，写进代码块即可）。

### 5.4 存量行内语法（不变）

`{{tag:xxx}}`（标签筛选链接）、`{{badge:文本|accent/warn/tip/muted}}`（徽章）、
`{{link:url|标题|描述}}`（链接卡）。以上全部语法对代码块保持字面文本。

### 5.5 新组件的实现位置（页面工程师向）

- 块级六件套与 `{{kbd}}` 的转换器在 `src/components/extend/extend-syntax.ts`，通过内容系统
  冻结扩展点 `registerPreTransformer` / `registerPostTransformer` 注册（该模块由
  `TagCloud.vue` 顶部 import 挂进加载链，先于任何渲染执行）；样式集中在
  `src/content-system/styles/content.css`，全部引用设计令牌，两种主题自动换肤。
- 新增语法无须改渲染主流程：容器类语法写 PostTransformer 重写 `ce-callout` 回填产物，
  行内语法写 PreTransformer；参见 `docs/CONTRACTS.md` §2.3。

## 6. 手写文章的上线检查清单

- [ ] 文件位于 `src/content/<分组>/`，slug 全站唯一
- [ ] frontmatter 至少有 `title`、`tags`（含 `post`）
- [ ] `npm run build` 通过（`vue-tsc` 会一并做类型检查）
- [ ] push 到 `main`，等 `deploy.yml` 跑完（Actions 页可见），访问 codrift.space 确认
