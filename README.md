# Codrift Space Site

**Codrift** 是 [lumenShen](https://github.com/lumenShen) 的个人品牌站：主页（品牌主视觉 + 作品集入口）、博客列表与文章页，部署于 **[codrift.space](https://codrift.space)**（GitHub Pages + 自定义域名，域名文件见 `public/CNAME`）。

技术栈：Vue 3.5（`<script setup lang="ts">`）+ TypeScript 5.9（strict）+ Vite 7 + vue-router 4（**hash 模式**，Pages 上刷新/直链无需 404 回退）+ `three` + `marked`。视觉基调：深色近黑底、青色高光、玻璃质感（毛玻璃表面），动效尊重 `prefers-reduced-motion`。

> 并行开发的模块契约（冻结签名、文件边界）见 [`docs/CONTRACTS.md`](docs/CONTRACTS.md)。

## 本地开发

要求 Node ≥ 22（CI 固定 Node 22）。

```bash
npm install        # 安装依赖（package-lock.json 必须提交，CI 用 npm ci 严格复现）
npm run dev        # 开发服务器
npm run build      # vue-tsc --noEmit && vite build，产物在 dist/
npm run preview    # 本地预览构建产物
```

## 内容系统

内容是仓库内自托管的文本文件（`src/content/<分组>/<slug>.<ext>`），**slug = 文件名去扩展名**，即路由 `/:slug`。元数据写在文件头 YAML frontmatter（`title`/`tags` 必填，`date`/`summary` 选填，规范见 [`docs/BLOG.md`](docs/BLOG.md)）。

三种内容类型（**类型由扩展名决定**）：

| 扩展名 | type | 渲染方式 |
| --- | --- | --- |
| `.html` | `html` | 去掉 frontmatter 后以受控方式注入 |
| `.md` | `markdown` | `marked` 渲染为 HTML |
| `.extend.md` | `markdownWithExtend` | 先按 markdown 渲染，再把正文中独立一行的 `<!-- extend:组件名 -->` 替换为已注册的 Vue 组件 |

标签体系（小写、不带空格，`getEntriesByTag` 大小写敏感）：

- `post` —— 博客文章必带；
- `home` —— 首页精选展示位；
- 其余自由标签（`vue`、`design`……）用于检索与分类。

## 目录结构

```
├── .github/workflows/
│   ├── deploy.yml          # Pages 部署流水线（push main / 手动触发）
│   └── blog.yml            # issue → 博客文章自动提交管线
├── docs/
│   ├── CONTRACTS.md        # 并行开发契约（冻结 API 与文件边界）
│   └── BLOG.md             # 发文指南（两种方式 + frontmatter + 标签约定）
├── public/
│   └── CNAME               # 自定义域名 codrift.space，随构建产物进 dist/，跨部署存活
├── scripts/
│   └── issue-to-post.mjs   # issue → markdown 转换脚本（零 npm 依赖，Node ≥ 18）
├── src/
│   ├── content/            # 内容条目（.html / .md / .extend.md）
│   ├── content-system/     # registry + render（import.meta.glob 收集内容）
│   ├── effects/            # 动效组件（GhostCursor / PixelTrail / GlassSurface …）
│   ├── pages/              # HomePage / BlogListPage / BlogPostPage
│   ├── router/             # vue-router（hash 模式）
│   ├── styles/             # tokens.css 设计令牌 + base.css
│   └── components/extend/  # extend 占位符对应的 Vue 组件
├── vite.config.js          # base: '/'（域名根部署）
└── index.html
```

## 两条流水线

### ① `deploy.yml` — 站点部署（push main 或手动触发）

`checkout → setup-node 22（npm 缓存）→ npm ci → npm run build → 上传 dist/ → deploy-pages 部署`。
权限最小化（`contents:read` / `pages:write` / `id-token:write`），并发组 `pages` 不取消进行中的部署。
首次使用需在仓库 Settings → Pages 把 Source 设为 **GitHub Actions**。

### ② `blog.yml` — issue 发文（issue 打 `blog` 标签时触发）

开 issue（标题=文章标题、正文=markdown）并打上 `blog` 标签（或创建时自带、或编辑已打标签的 issue）→
`scripts/issue-to-post.mjs` 经 GitHub API 取标题/正文/标签 → 生成 `src/content/posts/<日期>-<slug>-<issue号>.md`
→ 以 `github-actions[bot]` 身份 commit + push 回 `main`。编辑 issue 会覆盖同一篇文章（幂等）。

⚠️ 该管线用 `GITHUB_TOKEN` 推送的 commit 不会自动触发 `deploy.yml`（GitHub 规则），发文后需到
Actions 页手动 Run workflow 触发部署；自动化改造方案见脚本头注释与 `docs/BLOG.md` §4。

## License

[MIT](LICENSE)
