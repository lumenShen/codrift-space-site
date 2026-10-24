# docs/DESIGN-V2.md — Codrift V2 施工设计规格

> 版本：v2.1（2026-10-24 评审修订稿，回应评审 15 条）。读者：施工工程师，**只读本文档干活**。
> **基线声明**：本稿行号基于 2026-10-24 修订时点的工作区（已含 `/notes` 路由与 `src/pages/NotesPage.vue`）。
> 仓库存在并行施工，**行号会漂移——施工时一律以文件 + 选择器/类名定位，行号仅作参考**。
> 依据：`PRODUCT.md`、`index.html:14-22` DIRECTION CONTRACT（seed: pinned-brief-kexie-2026-10-24）、
> `src/styles/tokens.css`、2026-10-24 勘察报告（headerIssue / layoutNotes / tokenAudit / risks / extendApi）、
> 及本次实读的 `src/App.vue`、`src/components/SiteHeader.vue`、`SiteFooter.vue`、`PortfolioCard.vue`、
> `BlogCard.vue`、`CollapsibleSection.vue`、`FloatingActions.vue`、`AuroraBackdrop.vue`、
> `src/pages/HomePage.vue`、`BlogListPage.vue`、`BlogPostPage.vue`、`NotesPage.vue`、
> `src/content-system/**`（render.ts / extend/pipeline.ts / extend/containers.ts / extend/types.ts /
> index.ts / styles/content.css）、`src/components/extend/TagLink.vue`、`TagCloud.vue`、
> `src/router/index.ts`、`src/effects/GlassSurface.vue`、`src/effects/GradualBlur.vue`、
> `src/styles/base.css`、`docs/CONTRACTS.md`。
> 对比度均经 `node` WCAG 脚本实测（§3.2 各值旁标注，命令见 §7 验收 #6）。
> 参考对象：Kimi 应用（**只学结构与信息密度，不抄皮肤**——页头单点对齐、85vw 抽屉、桌面同面侧栏 + 内缩圆角面板、暗色扁平）。

---

## 0. 契约边界与前置修订

### 0.1 延续不变（V2 不得另起炉灶）

| 资产 | 依据 |
| --- | --- |
| 海军蓝黑底 `#05080f / #070c18`（暗色仍是默认主题） | tokens.css:13-14 |
| 斜向极光光带：蓝 `#4f8cff` / 青 `#38e0ff` / 绿 `#46e2a0` / 紫 `#8b7bff` | tokens.css:20-23 |
| 1px 冷描边玻璃面板 + Rein 光学层（构造保留，取值分主题重标，见 §3.4） | tokens.css:47-77 |
| 点题橙 `#ff9a4d` **只作强调**（口号关键词、旗舰徽章），不做大面积面 | tokens.css:37 |
| Archivo 变量字 + 中文黑体栈，靠字重字号说话 | tokens.css:100-105 |
| 卡片圆角 16px（工艺地板 12–16px） | tokens.css:82 |

### 0.2 V2 变更总览

1. **双主题**：暗色为默认并衰减到 Kimi 式扁平；新增亮色主题（Rein 高光学构造的亮色重标）。
2. **信息架构学 Kimi**：页头从「一条大玻璃胶囊」改为「无通栏底、单点对齐的悬浮小组件组」；新增左侧 **router-rail**（桌面停靠 / 移动 overlay）。
3. **页头 z 修复（勘察 headerIssue，升级方案 A'）**：GradualBlur 调用从 `target="page"` 改 `target="parent"`（v2.0 的 `-99` 补偿方案废弃——评审 #3 指出 `target='page'` 的 fixed 全宽条带还会糊住 dock rail，一并修复，见 §1.4/§1.5）。
4. **底部板块翻新**：页脚从居中两行小字改为三列网格；板块头/卡片统一形态；新增「条形组件圆角上限」工艺地板。
5. **扩展组件交付机制**（评审 #1/#2）：按「独立占位组件 / `:::` 容器 + PostTransformer 重写 / 行内语法」三条轨道交付，新增 6 个组件（timeline、stat-grid、faq、steps、feature-grid、gallery）+ 存量翻新 1（link-card）+ 新行内语法 1（kbd），详见 §5.0。

### 0.3 前置修订清单（动工第一步，需站长确认后落笔）

V2 引入亮色主题是方向契约层面的变更（勘察 risks 第 7 条），以下文本修改随 V2 首个 PR 一并提交：

| 文件 | 修订 |
| --- | --- |
| `index.html:14-22` | DIRECTION CONTRACT 追加一行：`V2: 双主题——暗色为默认（衰减为 Kimi 式扁平薄描边），新增亮色（Rein 高光学亮色重标）；页头/rail 结构学 Kimi，皮肤仍是极光玻璃。` |
| `PRODUCT.md:26` | 「本站恒为深色」→「默认暗色；V2 起提供亮色主题，玻璃 tint 跟随站点主题（不再读 OS 媒体查询）」。 |
| `index.html:6` | theme-color meta 改**单条、无 media 属性**：`<meta name="theme-color" content="#070c18">`；其 content 由内联脚本与 `useTheme` 随站点主题用 JS 改写（评审 #7：双 media meta 只跟 OS，手动切主题后浏览器框不跟随；单条 + JS 改写才是权威值，见 §3.1）。 |
| `src/styles/tokens.css:1-9` | 头注释「夜间极光 · 深色玻璃」→「夜间极光 · 双主题（暗色默认 + 亮色）」。 |
| `docs/CONTRACTS.md` | 同步 §0.5 全部新令牌、z 层级表新行（--z-rail）、GlassSurface tint 默认值变更（§3.4.3）、GradualBlur 调用约定（页头用 `target="parent"`，禁 `target="page"`，见 §1.5）。 |

### 0.4 全局工艺地板（保留 4 条 + 新增 3 条）

保留（违者打回）：

1. 无 eyebrow 小字（标题上方的小标签行）；
2. 无渐变文字；
3. 阴影必须有偏移且有模糊（禁止 `0 0 Npx` 纯辉光落影）；
4. 禁止彩色粗边（描边一律 1px，主色只允许出现在 1px 线与胶囊边缘光上）。

新增：

5. **条形组件圆角上限**：高度 ≤64px 的横条（页头元素、板块头行、工具条、页脚行）圆角只能是胶囊（9999px）或 ≤12px；禁止 16px+ 大圆角横栏（「大圆角丑栏」禁令，见 §4.4）。
6. **玻璃分级**：折射玻璃（GlassSurface 全栈）只给 hero 胶囊组、FAB 的重材质场景；页头品牌胶囊用 §3.4.2 的「轻玻璃」（纯 CSS，无 SVG 折射）；**overlay rail 面板不走玻璃分级**，用 §2.3 的专用规格。
7. **裸写禁令不变**：一切新值先进 tokens.css（§0.5），组件只引用令牌；新令牌必须同步 `docs/CONTRACTS.md`（tokens.css:8 既有规则）。
8. **等宽只给代码**：`--font-mono` 仅允许用在真正渲染机器文本的元素（`code`、`pre`、`kbd`、终端/代码可视化）。日期、域名、kicker/眉标、徽章、meta 行等非代码文字一律 sans；需要区分层级时用字重、字号、字距或更淡的 `--fg-2` 字色，不得切换字体（2026-10-24 站长令）。

### 0.5 新增 / 变更令牌总表（§3 给两主题取值；此处定名与归属）

| 令牌 | 归属 | 说明 |
| --- | --- | --- |
| `--z-rail` | 层级 | router-rail overlay 层，取 **400**（高于 FAB 200、低于光标 9999）；须同步 App.vue 头注释层级表 |
| `--rail-w` | 布局 | dock 态 rail 宽，**264px** |
| `--rail-offset` | 布局 | **运行时变量**（非静态主题值）：dock 且 rail 展开时 `264px`，其余（非 dock / dock 收起）恒 `0px`——由 `.app-shell` 的 class 与断点驱动（§2.2），一处变量联动 条带偏移 / 页头内边距 / 内容内边距 三处 |
| `--rail-overlay-w` | 布局 | overlay 抽屉宽，**min(85vw, 360px)** |
| `--on-accent` | 色彩 | 实底主色上的文字色（替换 SiteHeader.vue:177,187 的 `#071022`） |
| `--on-accent-strong` | 色彩 | 实底主色 **hover 强化态**上的文字色（评审 #4：亮色 hover 底加深后 `--on-accent` 深字只剩 2.88:1） |
| `--on-accent-2` | 色彩 | 实底橙上的文字色（替换 PortfolioCard.vue:127 的 `#211003`） |
| `--accent-text` | 色彩 | 链接/小号文字用主色（亮色下必须比 `--accent` 深，见 §3.2） |
| `--accent-2-text` | 色彩 | 亮色下橙的「文字安全档」（口号关键词用） |
| `--tab-hover` | 色彩 | 页头 tab / rail 条目 / 圆钮的 hover 底 |
| `--scrim` | 色彩 | overlay 遮罩色 |
| `--vignette-a` / `--vignette-b` | 色彩 | 极光暗角两段渐变（整段 gradient 字符串，替换 AuroraBackdrop.vue:119-120 字面） |
| `--aurora-o-a/b/c/d` | 色彩 | 四条光束的 opacity（替换 AuroraBackdrop.vue:41,66,79,87 写死值） |
| `--scrollbar-thumb` / `--scrollbar-thumb-hover` | 色彩 | 滚动条（替换 base.css:20,99,103 字面） |
| `--rail-panel-bg` | 色彩 | overlay 态 rail 面板底 |
| `--doc-panel-bg` | 色彩 | 文档面板底（§2.4） |
| `--glass-refract-fill` | 玻璃 | GlassSurface `fill` 参数的统一取值 |
| `--glass-border-strong` | 玻璃 | prefers-reduced-transparency 分支描边（GlassSurface.vue:491 在读，v2.0 漏定义，评审 #13 补入） |
| `--glass-solid` | 玻璃 | prefers-reduced-transparency 近实底（GlassSurface.vue:488 已读此名，补进 tokens） |
| `--ease-out-quart` / `--ease-drawer` | 动效 | `cubic-bezier(0.22,1,0.36,1)` / `cubic-bezier(0.32,0.72,0,1)` |
| `--dur-fast` / `--dur-base` / `--dur-slow` | 动效 | **160ms / 240ms / 360ms** |

---

## 1. 页头 SiteHeader V2

### 1.1 结构与单点对齐

无通栏底、无大胶囊条。页头是一排独立小元素，**共享一条 40px 垂直中轴线**（移动 36px），全部单点对齐、悬浮在内容上（Kimi 移动端页头结构）：

```
桌面（dock 态）：
┌────────────────────────────────────────────────────────────────────┐
│ [☰] (◈ Codrift)  (首页)(博客)(笔记)        (☀)(GH) [联系我]        │ ← 40px 轴
└────────────────────────────────────────────────────────────────────┘
  ↑左端=rail 右缘+24px                              右端=视口右-24px↑
移动（<640px）：
[☰] (◈ Codrift)                              (☀)
```

- 容器：`.header-layer` 保持 `position: fixed; inset: 0 0 auto; z-index: var(--z-header); pointer-events: none;`（SiteHeader.vue:76-82 原样），内边距改 `12px 24px 0`；左内边距 dock 态为 `calc(var(--rail-offset) + var(--space-5))`（随 rail 收起回 24px，联动规则见 §2.2）。
- `.header-row`：`display:flex; align-items:center; gap:8px; pointer-events:auto; height:40px;`（移动 36px）。**页头属于窗口，不属于 1080 文档列**：左端贴 rail 右缘+24px、右端贴视口右-24px，不做 max-width 居中（Kimi 桌面式）。
- 元素从左到右：菜单钮 → 品牌胶囊 → tab 组（左缘距品牌 12px）→ 弹性空隙 → 主题钮 → GitHub 钮 → CTA。

### 1.2 各元素规格

| 元素 | 尺寸 | 形态 |
| --- | --- | --- |
| 菜单钮（折叠 rail） | 40×40（移动 36×36）圆形 | 图标 18px 线性 icon（stroke 1.8）：桌面 `☰`↔`⇤`（rail 开/收），移动开态变 `×`；透明底 |
| 品牌胶囊 | 高 40px，padding 0 14px，radius-full | drift 双弧 mark 22px（现 SVG 原样，SiteHeader.vue:28-44）+ `Codrift` 1rem/750 `--fg-0`，轻玻璃底（§3.4.2） |
| 导航 tab（首页/博客/笔记） | 高 32px，padding 0 12px，radius-full | 0.875rem/500；默认透明底 `--fg-1`；hover 底 `--tab-hover` 字 `--fg-0`；active 判定见 1.2 末段（**不得依赖 router-link-active**），active 底 `--accent-dim` 字 `--accent-strong` 描边 1px `--accent-line`；当前 tab **不加**竖条/粗边 |
| 主题切换钮 | 40×40 圆形 | 图标 18px：暗色主题显示太阳、亮色显示月亮（即「点击后去往」的目标）；透明底 |
| GitHub 钮 | 40×40 圆形 | 官方 mark 18px `currentColor`；hover 底 `--tab-hover` |
| CTA「联系我」 | 高 40px，padding 0 16px，radius-full | 实底 `--accent`、字 `--on-accent` 0.875rem/650；hover 底 `--accent-strong` + 字 `--on-accent-strong`（评审 #4：亮色 hover 底加深到 `#1f56c4` 后深字仅 2.88:1 实测不达标，换浅字 `#ffffff` 6.59:1；暗色 hover 底 `#8ab4ff` 深字 9.09:1 维持 `#071022`，故 `--on-accent-strong` 两主题异值）；active `scale(0.97)` `var(--dur-fast)`；mailto 链接不变；**<640px 整体隐藏**（§1.6） |

按钮通用态：hover 底 `--tab-hover`（`var(--dur-fast)` ease-out）；active `scale(0.96)`；`focus-visible` 沿 base.css:79-83 全局环（2px `--accent`，offset 2px）。

**导航高亮判定（评审 #15，页头 tab 与 rail 关键链接共用同一规则）**：`/blog` 与 `/blog/:slug` 是兄弟路由记录（router/index.ts:17-21,28-33），`RouterLink` 的 `router-link-active` 与「按 route.name 相等」都命中不了读文章态——**不得**用 `router-link-active` class。统一用 computed 判定挂自定义 class：

| 项 | 激活条件 |
| --- | --- |
| 首页 | `route.name === 'home'` |
| 博客 | `route.name === 'blog-list' \|\| route.name === 'blog-post'`（等价于 hash path 前缀 `#/blog`） |
| 笔记 | `route.name === 'notes'`（独立专区，**不**并入博客项） |

### 1.3 状态

- **菜单钮**：`aria-expanded` 随 rail 状态（dock 开=true、dock 收=false、overlay 同理）；`aria-controls="router-rail"`。
- **主题钮**：`aria-label="切换到亮色主题" / "切换到暗色主题"`（动态）；切换时图标交叉旋转 `var(--dur-fast)`（旧图标 rotate(-90deg)+fade out，新图标自 rotate(90deg) fade in）；`prefers-reduced-motion` 下直接切换。
- **滚动两态**（见 1.4）：根元素挂 `data-scrolled="true|false"` 驱动：
  - **幽灵态**（scrollY ≤ 24px，页顶）：品牌胶囊、CTA 保持常态；**tab 与圆钮透明底**（无玻璃）；GradualBlur 条带各层 blur 归零。
  - **悬浮态**（scrollY > 24px）：品牌胶囊取轻玻璃值；GradualBlur 条带各层 blur 长回目标值。所有过渡 `var(--dur-base)` ease-out。
  - 阈值监听：`window scroll`（passive）+ `scrollY > 24` 布尔，与 FloatingActions.vue:14-16 同法。

### 1.4 滚动时的渐进模糊（评审 #3 修订：条带不得糊住 dock rail）

- GradualBlur 调用改为：`position="top" target="parent" height="5.5rem" :strength="2" :div-count="5" :z-index="1"`。**禁用 `target="page"`**：它触发 fixed 全宽（GradualBlur.vue:102,111-114，`left/right:'0'` 在 isVertical 分支写死、`props.style` 覆盖不了）+ 隐式 z+100（GradualBlur.vue:105），既糊 dock rail 又埋 z 陷阱。`target="parent"`（GradualBlur.vue:32,45，本就是默认值）走 absolute 定位、无 +100。
- **外包裹层只承担偏移**；显隐改为逐层过渡 `backdrop-filter` 的 blur 值（`--dur-base` ease-out）。**不得**用包裹层 opacity 显隐：opacity < 1 的祖先形成 backdrop root，层内 backdrop-filter 的采样瞬间变空，模糊只会在过渡端点整块跳变（突变）而非按时长渐变：
  ```css
  .header-blur-fade {
    position: absolute; top: 0;
    left: var(--rail-offset); right: 0;   /* dock 展开时从 rail 右缘起，不糊 rail */
    height: 5.5rem;
    pointer-events: none;
    transition: left var(--dur-base) var(--ease-out-quart);
  }
  .header-blur-fade :deep(.gradual-blur__layer) {
    transition: backdrop-filter var(--dur-base) ease-out,
                -webkit-backdrop-filter var(--dur-base) ease-out;
  }
  /* 幽灵态 blur 归零（!important 压过层内联目标值），悬浮态移除即长回目标值 */
  .header-layer:not([data-scrolled='true']) .header-blur-fade :deep(.gradual-blur__layer) {
    backdrop-filter: blur(0rem) !important;
    -webkit-backdrop-filter: blur(0rem) !important;
  }
  ```
  `--rail-offset` 由 §2.2 的 `.app-shell` class 驱动（dock 展开=264px，其余=0px），rail 收起时条带同步回全宽。GradualBlur 放此层内，absolute 定位相对该层（GradualBlur.vue:100 `isPageTarget=false → position:absolute`，最近 positioned 祖先即包裹层）。
- 条带高度 5.5rem 覆盖胶囊顶距 12px + 40px 的全部范围，模糊只作用于条带**身后**的内容与地面（层级见 1.5）。

### 1.5 z-index 层级表（含 headerIssue 修复 A'）

**全站表**（App.vue:2-17 头注释与 CONTRACTS §0 表同步新增 rail 行）：

| 层 | 令牌 | 值 |
| --- | --- | --- |
| 背景层（极光+动效） | `--z-bg-layer` | 0 |
| 内容层（router-view/页脚） | `--z-content` | 10 |
| 页头层 | `--z-header` | 100 |
| FAB 层 | `--z-fab` | 200 |
| **rail overlay 层（新）** | `--z-rail` | **400** |
| 光标层 | `--z-cursor` | 9999 |

**页头内部排序**（修复勘察 headerIssue——根因是 GradualBlur.vue:105 对 `target='page'` 隐式 +100，传入 1 实际得 101 > 胶囊层的 2）：

| 元素 | z-index | 说明 |
| --- | --- | --- |
| `.header-layer` | `var(--z-header)`=100 | fixed 自成 stacking context |
| ├ GradualBlur 条带 | **inline 1** | **调用 `target="parent"` + `:z-index="1"`**（absolute 分支不 +100，GradualBlur.vue:105），1 < 2 落到胶囊之下、仍在 header-layer(z=100) 内继续盖住页面内容。**调用约定（同步 CONTRACTS §3.5）**：本站页头禁用 `target="page"`（+100 陷阱 + fixed 全宽糊 rail 双重问题），并删除 v2.0 的「-99 补偿」要求——不再需要魔法补偿 |
| └ `.header-row` | 2 | 各小胶囊同层，DOM 顺序即绘制顺序 |

**rail 内部**（在 `--z-rail`=400 上下文内）：scrim z=1、面板 z=2。

### 1.6 断点行为

| 断点 | 表现 |
| --- | --- |
| ≥640px | 全元素（含 tab） |
| <640px | 隐藏 tab 组与 GitHub 钮（导航在 rail、GitHub 在 rail 关键链接区与页脚；联系我由 FAB 承载→CTA 也隐藏），只留 菜单钮 / 品牌胶囊 / 主题钮；轴高 36px |

---

## 2. router-rail

左侧导航轨。桌面（≥1024px）**停靠态**，窄于 1024px **overlay 态**。结构（从上到下）四区，两种形态共用 DOM：

```
┌──────────────┐
│ 个人区        │ ← mark + lumenShen + codrift.space
│ ──────────── │ ← 1px --line
│ ▪ 首页        │ ← 关键链接区（5 项）
│ ▪ 博客        │
│ ▪ 笔记        │
│ ▪ GitHub     │
│ ▪ 联系我      │
│ ──────────── │
│ 2026          │ ← 博客时间目录（按年分组，区内滚动）
│  10-21 文章…  │
│  10-08 文章…  │
│ ──────────── │
│ © 2026 Codrift│ ← 底部 meta
└──────────────┘
```

### 2.1 分区与条目样式

**个人区**：高 60px 块，无边框。左：40px 圆角（--radius-md）mark 片（底 `--accent-dim`，drift 双弧 SVG 居中）；右两行：`lumenShen`（0.95rem/700 `--fg-0`）、`codrift.space`（0.78rem mono `--fg-2`）。块底 margin 12px + 1px `--line` 分隔线。

**关键链接区**（Kimi「菜单项」位）：5 项（首页/博客/**笔记**/GitHub/联系我），每项高 40px、padding 0 12px、radius `--radius-md`(12px)、icon 18px + 文字 0.9rem，间距 12px：
- 默认：icon+字 `--fg-1`、透明底；hover：底 `--tab-hover` 字 `--fg-0`（`var(--dur-fast)`）；
- 当前路由项：按 §1.2 末段的判定表（`route.name` computed，**不得**用 router-link-active；笔记是独立项 `route.name === 'notes'`）→ 底 `--accent-dim`、icon+字 `--accent-strong`；无竖条无粗边；
- GitHub=外链（`target=_blank`，icon 用官方 mark）；联系我=mailto。

**博客时间目录**（Kimi「分组列表」位）：
- 数据源：`selectBlogEntries()` 按 `date` 降序；**按年分组**，组头=年份；无 `date` 的条目归入尾部「更早」组。
- 组头：0.78rem/600 `--fg-2`、`letter-spacing 0.02em`、`font-variant-numeric: tabular-nums`、margin `16px 4px 6px`。组头是内容层级（时间分桶），不是 eyebrow。
- 条目：高 36px、radius `--radius-sm`(8px)、`display:grid; grid-template-columns:44px 1fr; gap:8px; align-items:center; padding:0 8px;`
  - 日期列 `MM-DD`：0.75rem mono `--fg-2` tabular-nums；
  - 标题：0.875rem `--fg-1`，`white-space:nowrap; overflow:hidden; text-overflow:ellipsis`；
  - hover：底 `--tab-hover`、标题 `--fg-0`；
  - 当前阅读项（route.params.slug 匹配）：标题 `--accent-strong`、日期 `--accent`；
  - 整条是 `RouterLink` 至 `/blog/:slug`。
- 目录区 `flex:1; overflow-y:auto;`，滚动条用 `--scrollbar-thumb` 细轨（宽 6px）。

**底部 meta**：`padding-top 12px; border-top 1px --line;` 内容 `© 2026 Codrift`，0.75rem `--fg-2`。（站点无搜索需求，不放 Kimi 式底部搜索框。）

### 2.2 桌面停靠态几何与动效

- `position:fixed; top:0; bottom:0; left:0; width:var(--rail-w)(264px); padding:12px 16px;` **无自身底色**——与内容同一表面（页面地面即其面），仅右缘 1px `--line` 分隔；`display:flex; flex-direction:column; z-index:var(--z-content)`（dock 态不是浮层）。
- **运行时偏移变量**（评审 #3/#9 的联动核心）：`.app-shell` 上驱动 `--rail-offset`：
  ```css
  .app-shell { --rail-offset: 0px; }            /* 默认：非 dock / rail 收起 */
  @media (min-width: 1024px) {
    .app-shell:not(.rail-collapsed) { --rail-offset: var(--rail-w); }  /* dock 且展开 */
  }
  ```
  三处消费同一变量，随同一 class 同步过渡（`var(--dur-base)` `var(--ease-out-quart)`）：
  - `.header-layer` 左内边距：`calc(var(--rail-offset) + var(--space-5))`（rail 收起后页头回到 24px 贴边）；
  - `.header-blur-fade` 的 `left: var(--rail-offset)`（§1.4，条带不糊 rail）；
  - `.app-main` 左内边距：`calc(var(--rail-offset) + var(--space-5))`（原 `--space-5`=24px 右内边距保留），并新增内层 `.page-col { max-width:1080px; margin-inline:auto; }` 承载现有限宽（原 max-width:1080px 从 .app-main 迁入，App.vue:127-133）。
- **收起态几何（评审 #9）**：页头菜单钮切换 `.app-shell.rail-collapsed`。rail 收起用 **`margin-left: calc(-1 * var(--rail-w))` + `visibility: hidden`**（滑出而非压扁，避免内部内容挤压跳动）：
  ```css
  .rail { transition: margin-left var(--dur-base) var(--ease-out-quart), visibility 0s var(--dur-base); }
  .rail-collapsed .rail { margin-left: calc(-1 * var(--rail-w)); visibility: hidden; }
  ```
  - **不用 `display:none`**（保住滑出过渡）；`visibility: hidden` 保证收起后 rail 内链接**不可 Tab、不响应指针**（不留隐形焦点目标）。
  - `--rail-offset` 归 0 → 页头 padding、条带 left、内容 padding 三处同步回位（同一过渡时长/曲线，三者不脱节）。
  - 收起状态持久化 `localStorage['codrift.rail.collapsed']`，初始化时若为 true 则免动画直挂 class。
- **「内缩圆角面板」的取舍（写死，避免各做各的）**：首页 hero 不面板化（方向契约 FIRST VIEWPORT「满屏极光」优先）；**文档型内容面板化**——文章页正文（`.post-body` 外包 `.doc-panel`）：`border:1px solid var(--line); border-radius:var(--radius-lg)(16px); padding: var(--space-6) var(--space-7)(32/48px); background:var(--doc-panel-bg); box-shadow: var(--shadow-1), var(--glass-insets);` 即「同面 + 内缩圆角面板」落在文档流上。博客列表/首页不做整页面板（卡片本身已是面板）。
- dock 态 rail 是普通 `<nav aria-label="站点导航">` landmark：**无** dialog 语义、无焦点圈闭、无 inert。

### 2.3 移动 overlay 态几何与动效（Kimi 抽屉）

- 层容器：新增 `.rail-layer { position:fixed; inset:0; z-index:var(--z-rail)(400); pointer-events:none; }`，scrim 与面板都是它的子元素——**scrim z=1、面板 z=2**（层内排序，§1.5），两者本体 `pointer-events:auto`。
- 面板：`position:fixed; inset:0 auto 0 0; width:var(--rail-overlay-w)(min(85vw,360px)); padding:16px; background:var(--rail-panel-bg); backdrop-filter:blur(24px) saturate(1.2); border-right:1px solid var(--line-strong); box-shadow:var(--shadow-2); display:flex; flex-direction:column;`（分区间隔同 2.1；面板顶加一行：品牌 mark 20px + 右侧 32px 关闭圆钮 `×`，仅 overlay 态渲染）。
- scrim：`position:fixed; inset:0; background:var(--scrim);` 打开 fade in 240ms ease-out，点击关闭。
- **底层内容缩小右移、右缘露圆角**（Kimi 移动抽屉签名动效）：App.vue 新增 `.page-shift` 包裹 `.app-main` 与 `SiteFooter`（bg-layer/页头/FAB 不动）。抽屉开时：
  ```css
  .page-shift {
    transform: translateX(calc(var(--rail-overlay-w) * 0.9)) scale(0.96);
    transform-origin: left center;
    border-radius: 0 24px 24px 0;
    overflow: hidden;
    transition: transform var(--dur-slow) var(--ease-drawer); /* 360ms */
  }
  ```
  关闭：回位 `var(--dur-base)`(240ms) 同曲线。`will-change: transform` 仅在打开期间挂。
- 面板进场：`translateX(-100%) → 0`，`var(--dur-slow)`(360ms) `var(--ease-drawer)`；退场 `var(--dur-base)`(240ms)。scrim/底层位移与面板过渡**同时**启动（scrim fade 用 `var(--dur-base)`）。
- 跨断点（1024px）切换时：matchMedia 监听复位状态——overlay 开着升到 dock → 自动关、清 inert/滚动锁/transform。

### 2.4 关闭交互（四条全做）

1. 点击 scrim；
2. `Esc`（仅 overlay 开启期间在 window 监听 keydown）；
3. 面板内右上关闭圆钮（overlay 态）；
4. 面板内任意 RouterLink 跳转后自动关（overlay 态）。

dock 态只有「页头菜单钮」一个开关。

### 2.5 focus 管理与 ARIA（overlay 态）

- 打开：记录 `document.activeElement` → `panel.focus()`（面板 `tabindex="-1"`）→ 下一 Tab 落到面板内第一个可聚焦元素。
- 焦点圈闭：面板上监听 Tab，首尾循环（首个/末个可聚焦元素间跳转）。
- 背景失能：`.page-shift` 与页头根元素绑 `:inert="railOverlayOpen"`（Vue 3.5 原生支持 inert 属性），防 Tab 逃逸与读屏穿透。
- 关闭：移除 inert → 焦点还原到页头菜单钮。
- 滚动锁：开启期间 `document.documentElement.style.overflow='hidden'`，关闭还原（细滚动条 10px，不做 gutter 补偿）。
- ARIA：菜单钮 `aria-expanded`/`aria-controls="router-rail"`；面板 overlay 态 `role="dialog" aria-modal="true" aria-label="站点导航"`，dock 态为普通 nav（无 role/aria-modal）。
- `prefers-reduced-motion`：面板/scrim/底层位移全部瞬时显隐（transition:none），焦点流程不变。

---

## 3. 主题系统

### 3.1 作用域与切换机制

- **`:root` = 暗色（默认，值即现 tokens.css 衰减后的新值）**；`html[data-theme='light']` 挂亮色组。不用媒体查询驱动（切换由用户显式控制）。
- 防闪（FOUC）：`index.html` `<head>` 内联脚本（body 解析前），**同时改写 theme-color meta**（评审 #7）：
  ```html
  <meta name="theme-color" content="#070c18" />
  <script>
    (function () { try {
      var t = localStorage.getItem('codrift.theme');
      if (t !== 'light' && t !== 'dark')
        t = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
      document.documentElement.dataset.theme = t;
      var m = document.querySelector('meta[name="theme-color"]');
      if (m) m.setAttribute('content', t === 'light' ? '#f4f7fc' : '#070c18');
    } catch (e) {} })();
  </script>
  ```
- `base.css:18` `color-scheme: dark` 改为：`:root { color-scheme: dark; } html[data-theme='light'] { color-scheme: light; }`（原生控件/滚动条随主题）。
- 新增 `src/composables/useTheme.ts`：`{ theme: Ref<'dark'|'light'>, toggle(): void }`；写 `localStorage['codrift.theme']` + `documentElement.dataset.theme`，**并在初始化与每次 toggle 时同步改写 theme-color meta 的 content**（`light → '#f4f7fc'`，`dark → '#070c18'`；meta 绑 OS 的双 media 方案作废，理由见 §0.3）。
- toggle 时给 html 挂 `.theme-fade` 类（**类名统一为 `theme-fade`，评审 #12：v2.0 正文与 CSS 示例类名不一致会静默失效**）：
  ```css
  html.theme-fade * {
    transition: background-color var(--dur-base) ease-out,
                border-color var(--dur-base) ease-out,
                color var(--dur-base) ease-out;
  }
  ```
  `var(--dur-base)`(240ms) 后移除，避免全局过渡常驻。reduced-motion 时不挂该类（直接跳变）。

### 3.2 亮色调色板全套令牌（`html[data-theme='light']`）

命名延续，语义换值（「地面/前景/线条」的亮色化）：

| 令牌 | 亮色值 | 用途/对比 |
| --- | --- | --- |
| `--bg-0` | `#ffffff` | 最亮：内层/pre 实底 |
| `--bg-1` | `#f4f7fc` | 页面底（雾面蓝白） |
| `--bg-2` | `#eef3f9` | 次级面：表格头、代码块 |
| `--bg-3` | `#e4ebf5` | 第三层：kbd、hover 内层 |
| `--bg-glow` | `rgba(79,140,255,0.10)` | 顶部光晕不变 |
| `--fg-0` | `#0b1526` | 主文本（对 bg-1 ≈15:1） |
| `--fg-1` | `#3d4d6b` | 次要文本（≈7.9:1） |
| `--fg-2` | `#5f7092` | 弱化文本/占位（≈4.6:1） |
| `--accent` | `#4f8cff`（不变） | 图形/实底面；**亮色下不作小号文字色** |
| `--accent-strong` | `#1f56c4` | hover/强化（亮色下=加深而非提亮；**6.14:1 实测**） |
| `--accent-text` | `#2b66d9` | 链接与小号主色文字（**4.88:1 实测，AA**） |
| `--accent-dim` | `rgba(79,140,255,0.12)` | 主色弱化底 |
| `--accent-line` | `rgba(79,140,255,0.45)` | 胶囊边缘光 |
| `--accent-2` | `#ff9a4d`（不变） | 橙：亮色下只用于图形/实底徽章 |
| `--accent-2-text` | `#b35310` | 亮色下橙的文字档；评审 #6：旧值 `#c25f1a` 实测 3.95:1（AA-large 档）扛不住 `.hero-slogan-hl` 的 16.8–22.4px，加深到 **4.70:1（实测，全尺寸 AA）** |
| `--accent-2-dim` | `rgba(255,154,77,0.14)` | |
| `--line` | `rgba(11,21,38,0.10)` | 1px 冷描边（亮色=深色低透明，不是白线） |
| `--line-strong` | `rgba(11,21,38,0.22)` | |
| `--on-accent` | `#071022`（两主题同值） | `#4f8cff` 上 **5.90:1（实测）** |
| `--on-accent-strong` | `#ffffff` | 亮色 hover 加深底 `#1f56c4` 上的浅字，**6.59:1（实测）**；暗色取值 `#071022`（`#8ab4ff` 上 9.09:1，见 §3.3） |
| `--on-accent-2` | `#211003`（两主题同值） | `#ff9a4d` 上 **9.02:1（实测）** |
| `--shadow-1` | `0 1px 2px rgba(11,21,38,0.08)` | 有偏移有模糊 |
| `--shadow-2` | `0 14px 44px rgba(11,21,38,0.14)` | |
| `--scrim` | `rgba(11,21,38,0.35)` | |
| `--tab-hover` | `rgba(11,21,38,0.05)` | |
| `--rail-panel-bg` | `rgba(244,247,252,0.92)` | overlay 面板 |
| `--doc-panel-bg` | `rgba(255,255,255,0.6)` | 文档面板 |
| `--scrollbar-thumb` | `rgba(11,21,38,0.24)` | hover `0.38` |
| `--vignette-a` | `radial-gradient(ellipse 120% 70% at 50% 0%, rgba(244,247,252,0.2), rgba(238,243,250,0.62) 78%)` | 亮角=纸缘雾 |
| `--vignette-b` | `linear-gradient(to bottom, transparent 55%, rgba(238,243,250,0.55))` | |
| `--aurora-o-a/b/c/d` | `0.22 / 0.16 / 0.14 / 0.12` | 光束降为「薄雾」，blur 72px→88px |
| 玻璃组 | 见 §3.4 | |
| 暗色组全部保留值 | 见 §3.3 diff | |

### 3.3 暗色衰减到 Kimi 式扁平（`:root` 新值，旧→新 diff）

Kimi 暗色要点：整体扁平、细描边、几乎无辉光。手段：**砍白光学层与辉光，玻璃底收实，阴影保留轻悬浮**（仍满足「偏移+模糊」地板）。

| 令牌 | 旧（现状） | 新（Kimi 扁平） |
| --- | --- | --- |
| `--glass-bg` | `rgba(10,18,36,0.66)` | `rgba(12,18,34,0.72)`（收实一档） |
| `--glass-border` | `rgba(160,190,240,0.2)` | `rgba(148,172,214,0.14)` |
| `--glass-highlight` | `rgba(255,255,255,0.07)` | `rgba(255,255,255,0.04)` |
| `--glass-shadow` | `0 10px 36px rgba(2,6,16,0.5)` | `0 1px 2px rgba(2,6,16,0.4), 0 10px 36px rgba(2,6,16,0.38)` |
| `--glass-rim-hi` | `rgba(255,255,255,0.6)` | `rgba(255,255,255,0.10)` |
| `--glass-rim-lo` | `rgba(255,255,255,0.16)` | `rgba(255,255,255,0.05)` |
| `--glass-sheen` | `rgba(255,255,255,0.26)` | `rgba(255,255,255,0.06)` |
| `--glass-rim-2` | `rgba(255,255,255,0.3)` | `rgba(255,255,255,0.09)` |
| `--glass-caustic` | `rgba(255,255,255,0.22)` | `rgba(255,255,255,0.05)` |
| `--glass-halo` | `0 -1px 20px -8px rgba(255,255,255,0.3)` | `0 -1px 20px -8px rgba(255,255,255,0.10)` |
| `--glass-insets` | 四层拼法 | **构造不变**，四层引用上述新值自动衰减 |
| `--glass-fallback-fill` | `rgba(8,14,28,0.74)` | `rgba(10,16,30,0.86)` |
| `--glass-border-strong` | （GlassSurface.vue:491 兜底 `rgb(160 190 240/0.34)`） | `rgba(148,172,214,0.34)`（字面转正并对齐新 border 色系；评审 #13） |
| `--glass-solid` | （GlassSurface.vue:488 兜底 `rgb(8 14 28/0.92)`） | `rgba(9,14,26,0.95)`（正式入 tokens） |
| `--vignette-a` | `radial-gradient(ellipse 120% 70% at 50% 0%, rgba(5,8,15,0.1), rgba(5,8,15,0.72) 78%)` | 同旧值（AuroraBackdrop.vue:119 字面转正） |
| `--vignette-b` | `linear-gradient(to bottom, transparent 55%, rgba(5,8,15,0.6))` | 同旧值（AuroraBackdrop.vue:120 转正） |
| `--aurora-o-a/b/c/d` | `0.5/0.34/0.3/0.26` 写死 | `0.5/0.34/0.3/0.26`（转正为令牌） |
| `--tab-hover` | — | `rgba(140,172,214,0.10)` |
| `--scrim` | — | `rgba(2,6,16,0.55)` |
| `--rail-panel-bg` | — | `rgba(7,12,24,0.92)` |
| `--doc-panel-bg` | — | `rgba(12,20,38,0.55)` |
| `--scrollbar-thumb` | `rgba(140,172,224,0.26/0.44)` 写死 | `rgba(140,172,224,0.26)` / hover `0.44`（转正） |
| `--accent-text` | — | `#4f8cff`（暗色下即 `--accent`，**6.07:1 实测**） |
| `--accent-2-text` | — | `#ff9a4d`（暗色下即 `--accent-2`，9.29:1 实测） |
| `--on-accent-strong` | — | `#071022`（暗色 hover 底 `#8ab4ff` 上 **9.09:1 实测**；亮色取值 `#ffffff`，见 §3.2） |
| `--bg-0/1/2/3`、`--fg-0/1/2`、`--accent*`、`--aurora-*`、`--radius-*`、`--space-*`、`--font-*`、z 表 | — | **不变** |

### 3.4 玻璃光学层：两套值

> 解释一句「亮色用现状」：亮色主题**沿用现状 Rein 超高光学构造**（rim/sheen/rim-2/caustic/halo 全套都在），只是整套重标为亮色取值；暗色按 §3.3 衰减到 Kimi 扁平。两种主题共用同一份组件代码，只换令牌。

#### 3.4.1 亮色玻璃（`html[data-theme='light']`）

| 令牌 | 亮色值 |
| --- | --- |
| `--glass-bg` | `rgba(255,255,255,0.62)` |
| `--glass-border` | `rgba(11,21,38,0.10)` |
| `--glass-blur` | `6px`（不变） |
| `--glass-highlight` | `rgba(255,255,255,0.55)` |
| `--glass-shadow` | `0 1px 2px rgba(11,21,38,0.06), 0 10px 36px rgba(31,51,89,0.12)` |
| `--glass-rim-hi` | `rgba(255,255,255,0.95)` |
| `--glass-rim-lo` | `rgba(255,255,255,0.40)` |
| `--glass-sheen` | `rgba(255,255,255,0.60)` |
| `--glass-rim-2` | `rgba(255,255,255,0.70)` |
| `--glass-caustic` | `rgba(79,140,255,0.12)`（蓝调焦散） |
| `--glass-halo` | `0 -1px 16px -6px rgba(79,140,255,0.25)`（冷光晕） |
| `--glass-insets` | 构造不变（tokens.css:73-77） |
| `--glass-fallback-fill` | `rgba(255,255,255,0.78)` |
| `--glass-border-strong` | `rgba(11,21,38,0.24)`（reduced-transparency 分支描边） |
| `--glass-solid` | `rgba(255,255,255,0.95)` |
| `--glass-refract-fill` | `hsl(0 0% 100% / 0.72)` |

#### 3.4.2 「轻玻璃」公共类（**仅页头品牌胶囊引用**；评审 #8：overlay rail 面板不引用本类——胶囊形 radius-full、四边 1px、blur 12px 与全高直角抽屉的 §2.3 规格（blur 24px、仅 border-right、`--rail-panel-bg`、`--shadow-2`）直接冲突，rail 面板以 §2.3 为准）

新公共类 `.chip-glass`（放 base.css 或新 `src/styles/glass.css`）：

```css
.chip-glass {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(12px) saturate(1.3);
  -webkit-backdrop-filter: blur(12px) saturate(1.3);
  box-shadow: var(--shadow-1), var(--glass-insets);
  border-radius: var(--radius-full);
}
@media (prefers-reduced-transparency: reduce) {
  .chip-glass { background: var(--glass-solid); backdrop-filter: none; -webkit-backdrop-filter: none; }
}
```

不用 GlassSurface 折射分支（重材质留给 hero 胶囊组与 FAB，见 §0.4 第 6 条）。

#### 3.4.3 GlassSurface 组件改造（随主题系统必须做的三处）

1. `tint` 默认 `'dark'` → `'auto'`（GlassSurface.vue:111），`darkTint` 的 `isDarkMode` 改为**跟随站点主题**（读 `document.documentElement.dataset.theme`，监听其变化；删掉 prefers-color-scheme 依赖，GlassSurface.vue:157,388-392）。
2. 折射底色改读统一令牌：调用方传 `fill="var(--glass-refract-fill)"`（组件仍支持 fill prop 不变）；两主题取值见 3.4.1 与下：暗色 `--glass-refract-fill: hsl(219 46% 6% / 0.72)`（≈现 `hsl(0 0% 0%/0.72)` 观感、带海军蓝调）。
3. 兜底字面量（GlassSurface.vue:462-479,488）全部改为 `var(--glass-…, 旧字面量)` 形式——令牌在场时取令牌（两主题自动换肤），令牌缺失时保持暗色兜底（自包含契约不破坏）。 GlassSurface.vue:34 头注释补一句「fill 建议传 var(--glass-refract-fill)」。

### 3.5 极光与地面亮色化

- AuroraBackdrop.vue 四条 beam 的 opacity（:41,66,79,87 写死）改 `opacity: var(--aurora-o-a)` 等 4 个令牌；亮色按 §3.2 减半成薄雾，blur 72px→88px。
- 暗角（:119-120 字面）改 `background: var(--vignette-a), var(--vignette-b);`。
- base.css:26-28 body 顶光晕与 `--bg-1` 自动随主题。
- PixelTrail / GhostCursor 仍收 `--accent` 派生色（亮暗都是 `#4f8cff`，可直接用，见 3.6 App.vue 条）。

### 3.6 组件级硬编码色替换对照表

> **基线**：A 表行号 = 2026-10-24 修订时 `grep -rnE "color:\s*var\(--accent\)|color:\s*var\(--accent-2\)" src/` 实测结果；并行施工会漂移，**以选择器定位**。

**通则（评审 #5）**：凡 `--accent` / `--accent-2` 出现在 **color / caret-color / accent-color（「墨水」用途）** 一律换 `--accent-text` / `--accent-2-text`——亮色下 `#4f8cff` 作墨水对 `#f4f7fc` 仅 **3.00:1（实测）**，不达 AA；出现在 **border\* / background / stroke（描边、底面、图形填充）** 保持 `--accent` / `--accent-2` 不变（图形 3:1 压线达标或属装饰）。v2.0 只列了 3 处墨水用法，漏掉了整类——下表按实测补全。

**A. 主色/橙作文字色 → `--accent-text` / `--accent-2-text`（逐行）**

| 位置（文件 · 选择器 · grep 行号） | 现值 | 改为 |
| --- | --- | --- |
| `src/styles/base.css:33` · `caret-color` | `var(--accent)` | `var(--accent-text)` |
| `src/styles/base.css:51` · `a` | `var(--accent)` | `var(--accent-text)`（hover 仍 `--accent-strong`） |
| `src/components/extend/TagLink.vue:43` · `.tag-link` | `var(--accent)` | `var(--accent-text)` |
| `src/components/extend/TagCloud.vue:43` · `.tag-cloud__item` | `var(--accent)` | `var(--accent-text)` |
| `src/components/PortfolioCard.vue:224` · `.repo-stars svg` | `var(--accent)` | `var(--accent-text)` |
| `src/pages/HomePage.vue:303` · `.hero-slogan-hl` | `var(--accent-2)` | `var(--accent-2-text)`（评审 #6） |
| `src/pages/HomePage.vue:373` · `.more-link` | `var(--accent)` | `var(--accent-text)` |
| `src/pages/BlogListPage.vue:144` · `.notes-banner-badge` | `var(--accent-2)` | `var(--accent-2-text)` |
| `src/pages/BlogListPage.vue:159` · `.notes-banner-hl` | `var(--accent-2)` | `var(--accent-2-text)` |
| `src/pages/BlogListPage.vue:175` · `.notes-banner-cta` | `var(--accent)` | `var(--accent-text)` |
| `src/pages/BlogListPage.vue:219` · `.tag-chip.is-active` | `var(--accent)` | `var(--accent-text)` |
| `src/pages/BlogListPage.vue:238` · `.empty-reset` | `var(--accent)` | `var(--accent-text)` |
| `src/pages/BlogPostPage.vue:107` · `.post-tag` | `var(--accent)` | `var(--accent-text)` |
| `src/pages/BlogPostPage.vue:136` · `.missing-link` | `var(--accent)` | `var(--accent-text)` |
| `src/pages/NotesPage.vue`（本次 grep：503 `--accent-2`、708/1050/1075/1102 `--accent`，共 5 处） | `var(--accent[-2])` | `var(--accent-text)` / `var(--accent-2-text)` |
| `src/components/NotesReader.vue:675` | `var(--accent)` | `var(--accent-text)` |
| `src/content-system/styles/content.css:61` · `.ce-markdown a` | `var(--accent)` | `var(--accent-text)` |
| `src/content-system/styles/content.css:166` · `input[type='checkbox']` `accent-color` | `var(--accent)` | `var(--accent-text)` |
| `src/content-system/styles/content.css:204` · `.ce-callout--note .ce-callout__title::before` | `var(--accent)` | `var(--accent-text)` |
| `src/content-system/styles/content.css:214` · `.ce-callout--warn .ce-callout__title::before` | `var(--accent-2)` | `var(--accent-2-text)` |
| `src/content-system/styles/content.css:248` · `.ce-badge--accent` | `var(--accent)` | `var(--accent-text)` |
| `src/content-system/styles/content.css:260` · `.ce-badge--warn` | `var(--accent-2)` | `var(--accent-2-text)` |
| `src/content-system/styles/content.css:271` · `.ce-tag` | `var(--accent)` | `var(--accent-text)` |

**B. 其它硬编码（沿 v2.0，逐条施工）**

| 位置 | 现值 | 改为 |
| --- | --- | --- |
| `src/components/AuroraBackdrop.vue:119-120` | `rgba(5,8,15,…)` 字面 ×2 | `var(--vignette-a), var(--vignette-b)` |
| `src/components/AuroraBackdrop.vue:41,66,79,87` | opacity `0.5/0.34/0.3/0.26` 写死 | `var(--aurora-o-a/b/c/d)`（beam blur 亮色 88px 用 `html[data-theme='light'] .beam { filter: blur(88px); }`） |
| `src/components/SiteHeader.vue:177,187` | `#071022` ×2 | `var(--on-accent)`（CTA hover 字另见 §1.2 的 `--on-accent-strong`） |
| `src/components/PortfolioCard.vue:95` | `rgba(79,140,255,0.14)` | `color-mix(in srgb, var(--accent) 14%, transparent)` |
| `src/components/PortfolioCard.vue:127` | `#211003` | `var(--on-accent-2)` |
| `src/pages/HomePage.vue`（`.hero::before` 光斑） | `rgba(79,140,255,0.2)` | `color-mix(in srgb, var(--accent) 20%, transparent)` |
| `src/styles/base.css:18` | `color-scheme: dark` 写死 | `:root{color-scheme:dark}` + `html[data-theme='light']{color-scheme:light}` |
| `src/styles/base.css:20,99,103` | `rgba(140,172,224,…)` ×3 | `var(--scrollbar-thumb)` / hover `--scrollbar-thumb-hover` |
| `src/App.vue:36` | 兜底 `'#38bdf8'`（与令牌不一致） | 兜底改 `'#4f8cff'`（对齐 `--accent`），并按 §3.7 留响应式注释 |
| `src/effects/PixelTrail.vue:53,242-243` | color 默认 `'#ffffff'`、渐变端点写死 | 渐变亮端点参数化为 prop（默认保持白）；App 仍传 accent |
| `src/effects/GhostCursor.vue:67` | 兜底 `'#A0FFBC'` | 兜底 `'#4f8cff'` |
| `src/effects/TargetCursor.vue:432,451` | `var(--tcursor-color, #ffffff)` | fallback 改 `var(--tcursor-color, var(--fg-0))` |
| `src/effects/GlassSurface.vue:109-111` | `tint` 默认 `'dark'` | `'auto'`（见 §3.4.3） |
| `src/effects/GlassSurface.vue:157,388-392` | isDarkMode 读 OS | 跟随站点 data-theme（见 §3.4.3） |
| `src/effects/GlassSurface.vue:462-479,488,491` | 暗色字面兜底全套 | `var(--glass-…, 旧字面)`（含 `--glass-border-strong`，见 §3.3/§3.4.3） |
| `index.html:6` | 单一深色 theme-color | 单条 meta + JS 随主题改写（§3.1） |

**C. 保留不改（通则的非墨水例外，勿误改）**

- 描边/边框：`PortfolioCard.vue:118`（hover border）、`BlogListPage.vue:134,217`（border）、`content.css:181,191`（callout 左条 3px——引用标记惯例，是「彩色粗边」禁令的既有豁免，V2 不动）。
- logo/装饰图形：`SiteHeader` brand-mark 的 `stroke="var(--accent)/var(--accent-2)"`（旁有文字标签，装饰性，无对比度要求）。
- 实底面上的字：已走 `--on-accent*`（A 表通则之外）。
- `src/content/demo/particle-demo.css`：sandbox iframe 隔离（勘察已核），**不动**。

**验收 grep（可查 var() 引用，评审 #5；`^\s*` 锚定排除 `border-color:` 等保留项的子串误匹配）**：

```bash
grep -rnE "^\s*(accent-|caret-)?color:\s*var\(--accent(-2)?\)" src/ --include="*.vue" --include="*.css" | grep -v ".selftest-out"
# 预期：0 命中（2026-10-24 基线为 27 命中 = A 表全部行；border-color 5 处不在此命令命中范围）
```

### 3.7 JS 侧主题响应（勘察 risks 第 4 条）

- `App.vue:33-36` 的 `accentColor` 一次性 `getComputedStyle` 读取改为响应式：`computed` 依 `useTheme().theme` 返回 `theme==='light' ? '#4f8cff' : '#4f8cff'`——两主题主色同值，故**实作上只需把兜底改 `'#4f8cff'` 并保留一次性读取**，但必须留注释：未来若引入随主题变化的动效主色，此处要改 watch。**不得**动 App.vue:42-57 的 window→bg-layer 指针转发（PixelTrail/GhostCursor 靠合成事件驱动）。
- `useTheme` 切换时无需通知动效层（主色两主题同值）。

---

## 4. 底部板块翻新（解决「大圆角丑栏」）

### 4.1 板块头（CollapsibleSection V2 + 页面级头）

- CollapsibleSection 外壳保留 `1px --line + radius-lg(16px) + --glass-bg + --shadow-1, --glass-insets`（值经 §3 自动衰减）；**头部行改条形**：`padding: 14px 24px; min-height:56px;` 标题 1.2rem/700 不变，chevron 圆片 30px 不变；头部行与内容区之间加 `border-bottom: 1px solid var(--line)`（仅展开态可见，`is-open` 时渲染）。
- 收起态视觉 = 一条 56px 行 + 16px 圆角外壳（不是大圆角栏：外壳是纵向卡片，圆角合规 §4.4）。
- 页面级头（BlogListPage `.page-head`）：h1 1.9rem/700 保留；`.page-sub`（「共 N 篇 · 点击标签筛选」）保留 0.88rem `--fg-2`——它带信息量，不是 eyebrow；头部下 margin 24px。禁止给页面头加玻璃盒。
- 首页 `sections-tools`（全部展开/收起）保持右对齐小按钮组（GlassButton size sm 32px 高）。

### 4.2 卡片

- BlogCard / PortfolioCard：结构与尺寸全保留（padding 24px、gap、grid minmax 260/280px）；材质经 §3.3 衰减（暗色不再「肿」）；hover 仍 `translateY(-2px)` + border `--accent-line`（reduced-motion 去位移，现状已有）。
- 旗舰卡（Rein）：`color-mix` 渐隐底 + 橙徽章（`--on-accent-2`）不变；徽章是全站唯一橙色实底面，维持。

### 4.3 页脚 SiteFooter V2

去「居中两行小字」，改三列网格页脚；**无玻璃盒、无大圆角、无列头**（评审 #11：图示与条文统一为「三列纵向堆叠、无列头」，链接归属靠列位置自明）：

```
───────────────── ← 极光发丝线（保留现状 ::before，min(680px,80%) 渐隐线）
│ ◈ Codrift           首页                GitHub              │
│ 一个人的代码漂流站     博客                gozaoo@outlook.com  │
│                                         codrift.space      │
───────────────── ← 1px --line（max 1080px）
© 2026 lumenShen · codrift.space
```

- 布局：桌面 `grid-template-columns: 1.4fr 1fr 1fr; gap:48px; max-width:1080px; margin-inline:auto;`；<768px 单列堆叠、间距 24px。
- 品牌列：mark 20px + `Codrift` 0.95rem/700 `--fg-0` + 「一个人的代码漂流站」0.85rem `--fg-2`（PRODUCT 定稿文案原样）。
- 两个链接列**纵向堆叠、无列头**：链接各自一行、行距 8px（`display:flex; flex-direction:column; gap:8px;`）；链接 0.875rem `--fg-1`，hover `--accent-strong`。列 2 = 站内（首页/博客），列 3 = 联系（GitHub/gozaoo@outlook.com/codrift.space）。
- meta 行：0.75rem `--fg-2`，上缘 `1px solid var(--line)`、上 padding 16px；© 行**不放**桂电提及（身份提及只在关于板块一句话，PRODUCT.md:11）。
- padding：`48px 24px 128px`（底部大留白避开 FAB 保留，SiteFooter.vue:30 现值）。
- 桂电/邮箱/GitHub 等事实文案一律不改（PRODUCT.md「不做」条）。

### 4.4 条形圆角新规（§0.4 第 5 条的落实）

条形组件（高 ≤64px）圆角只允许胶囊或 ≤12px。存量排查：现仓库无违例（SiteHeader 胶囊条 V2 拆散后消失；CollapsibleSection 是纵向卡片不算条形）；后续新增组件违例打回。

---

## 5. 扩展组件视觉规范（两种主题）

### 5.0 交付机制与口径（评审 #1/#2 修订：三条轨道，逐组件指定）

**现状机制事实（本次实读）**：
- `render.ts:39` `EXTEND_COMMENT_RE=/<!--\s*extend:([A-Za-z0-9_-]+)\s*-->/g` 只捕获**组件名、不带任何参数**；`render.ts:58-62` 以 `h(component, { key })` 挂载、**不透传内容**（无 props 无 slot）——独立行占位组件拿不到包裹正文。
- `:::` 容器：`calloutContainersPre` 对**任意**名字生效（containers.ts:61-64 开栏正则 `[A-Za-z0-9_-]+`），内部 markdown 经 `ctx.render` 递归渲染（containers.ts:41），整体存 stash（:47-50）并以单行占位 `<!--ce-callout:<id>-->` 留在原文（:52），最终输出 `<section class="ce-callout ce-callout--<name>">`（:49）。
- `registerPreTransformer` 追加在管线末尾（pipeline.ts:25,29-31，pre 序列 = `[calloutContainersPre, inlineTemplatesPre]`）→ 自定义 Pre **拦不到原始 `:::` 语法**（已被 callout 抽走）。
- `registerPostTransformer` 追加在 `calloutRestorePost` **之后**（pipeline.ts:26,34-36）→ 执行时占位已回填（containers.ts:80-85），自定义 Post 看到完整回填 HTML。

**三条轨道**：

| 轨道 | 语法 | 适用 | 交付物 |
| --- | --- | --- | --- |
| **A · 独立占位组件** | `<!-- extend:Name -->`（独立行） | 自取数据、**不包裹正文**的组件（现状 TagCloud/TagLink） | `src/components/extend/<Name>.vue` + `content.ts` 注册 + 独立行占位 |
| **B · `:::` 容器 + PostTransformer 重写** | `:::name [参数]` … `:::`（独立行） | **包住 markdown 内容**的容器型组件（timeline/stat-grid/faq/steps/feature-grid/gallery） | **零新增 Pre、零改 containers.ts/render.ts**：callout 机制天然完成抽取+递归渲染；页面侧注册一个 PostTransformer（`registerPostTransformer`，index.ts:19 已导出），用非贪婪正则把 `<section class="ce-callout ce-callout--<name>">…<div class="ce-callout__body">INNER</div></section>` 重写为目标结构 HTML（`ce-callout__title` 段映射为组件标题）；INNER 内按各组件的条目约定（markdown 列表，见下）重组。**注册放 `content.ts` 的 `ensureExtendComponentsRegistered()`**（幂等 flag 内，与轨道 A 同处） |
| **C · 行内语法** | `{{kbd:…}}` | 行内小件 | 新 PreTransformer（追加在 `inlineTemplatesPre` 之后），经 `mapOutsideFences`（scanner.ts——需在 `content-system/index.ts` **补充导出**，先例同 buildTagHref，index.ts:7-10 的「契约外补充导出」机制）避开代码围栏，行内直接替换 `<kbd class="ce-kbd">`（行内 HTML marked 原样透传，无容器类空行截断问题） |

**轨道 B 的硬约束（写进内容作者约定）**：专名容器内**不得嵌套其它 `:::` 容器**（非贪婪配对的前提）；嵌套属未定义行为。条目内可嵌普通 markdown（加粗/链接/行内代码）。

**口径（评审 #2）**：新增组件 **6 个**（timeline、stat-grid、faq、steps、feature-grid、gallery，全走轨道 B）+ 存量翻新 1（link-card，仅 content.css 类重标，无新组件）+ 新行内语法 1（kbd，轨道 C）；存量轨道 A 组件 2（TagLink/TagCloud）不动。

**通用视觉规则**：全部取值走 tokens（两主题自动换肤）；容器/组件统一 `--radius-md`(12px) 或开放式无盒；内部排版继承 `.ce-markdown`；hover 位移 ≤2px、时长 ≤`var(--dur-base)`(240ms)；reduced-motion 全部去位移；样式统一写进 `content-system/styles/content.css`（类名前缀 `.ce-`）。

### 5.1 timeline（轨道 B）

- 语法：`:::timeline`；条目 `- 日期 \| 标题 \| 描述`（半角竖线分隔，描述可缺省；日期建议 `YYYY-MM-DD`）。
- 开放式时间线，**不盒装**：左轨 `2px solid var(--line)`（竖线），节点在轨上。
- 节点：普通=8px 空心圆（`border:2px solid var(--line-strong)`，底同地面）；关键/最新=8px 实心 `var(--accent)` + 外环用 **outline**（评审 #14：`box-shadow: 0 0 0 4px …` 是无偏移无模糊的 spread 环，按地板 #3 字面会被打回；改 `outline: 4px solid color-mix(in srgb, var(--accent) 16%, transparent); outline-offset: 2px;`——描边不在阴影禁令内，与 focus ring（base.css:79-83）同机制）。
- 条目：`padding-left:20px`，条目间距 20px；时间 `0.78rem mono var(--fg-2) tabular-nums`；标题 `0.95rem/650 var(--fg-0)`；描述 `0.875rem var(--fg-1) line-height 1.7`。
- 两主题差异：仅经令牌自动（轨线/节点色）。

### 5.2 stat-grid（轨道 B）

- 语法：`:::stat-grid`；条目 `- 数值 \| 标签`；**数值段用 `**…**` 包裹即为高亮项**（markdown 原生，Post 检测 `<strong>`）。
- `display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:24px; margin:16px 0;` 无边框无底（纯排版网格）。
- 数值：`font-family:var(--font-display); font-weight:750; font-size:clamp(1.6rem,3vw,2.2rem); color:var(--fg-0); font-variant-numeric:tabular-nums; letter-spacing:-0.02em;`；高亮项数值 `var(--accent-text)`（一屏最多一个，内容作者自律）。
- 标签：`0.8rem var(--fg-2)`，数值下 4px。

### 5.3 link-card（存量翻新，无新组件）

- 现有 `.ce-linkcard`（content.css:285-328）类重标：结构/尺寸保留（radius-md、padding 12px 16px、host 右上 mono）；材质升级：底 `var(--glass-bg)` + `box-shadow: var(--shadow-1), var(--glass-insets)`（补上现缺的光学内层）；hover 保持 `translateY(-1px)` + border `--line-strong`。
- 标题 `var(--fg-0)`、描述 `var(--fg-1)`、host `var(--fg-2)` 不变；`{{link:…}}` 行内机制不动。

### 5.4 faq（轨道 B）

- 语法：`:::faq`；条目 `- 问题 \| 答案`（答案含行内 markdown）。
- 交付：Post 重写为 `<details class="ce-faq__item"><summary>…</summary><div class="ce-faq__a">…</div></details>` 组。
- 开放式列表，条目间 `border-top:1px solid var(--line)`（首条无）。
- 问题行：`<summary>` 高 44px、0.95rem/650 `var(--fg-0)`、右侧 16px chevron（开时 rotate 180°、`var(--dur-base)`）；`list-style:none` 去 marker。
- 答案区：`padding: 0 0 16px;` 0.9rem `var(--fg-1)`。
- `details[open]` 不加底色（扁平）；focus-visible 全局环。

### 5.5 steps（轨道 B）

- 语法：`:::steps`；条目**有序列表** `1. 标题 \| 描述`。
- 竖排：编号圆片 24px（`border:1px solid var(--line-strong); border-radius:9999px;`，mono 0.8rem `var(--accent-text)`）；圆片间以 `border-left:2px dashed var(--line)` 连接（在圆片中线下延 16px）。
- 标题 0.95rem/650 `var(--fg-0)`；描述 0.875rem `var(--fg-1)`；步间距 20px。

### 5.6 kbd（轨道 C，行内语法）

- 语法：`{{kbd:Ctrl\|K}}`（`\|` 分隔多键）；Pre 经 `mapOutsideFences` 防误伤代码块，输出 `<kbd class="ce-kbd">Ctrl</kbd><span class="ce-kbd-plus">+</span><kbd class="ce-kbd">K</kbd>`（键名 `escapeHtml`）。
- 样式：`display:inline-block; padding:1px 6px; border:1px solid var(--line); border-radius:var(--radius-sm)(8px); background:var(--bg-3); color:var(--fg-0); font-family:var(--font-mono); font-size:0.82em; line-height:1.5; box-shadow: var(--shadow-1);`（两主题经令牌自动：暗底 `--bg-3 #111b33`、亮底 `#e4ebf5`；阴影走 `--shadow-1` 保偏移+模糊合规）。
- 连接符 `+`：`0.82em var(--fg-2)`。

### 5.7 feature-grid（轨道 B）

- 语法：`:::feature-grid`；条目 `- 图标名 \| 标题 \| 描述`。图标名映射到**内置 SVG sprite**（线性 1.7 stroke，首批 10 个：bolt/book/code/star/mail/link/terminal/compass/archive/cpu），未知名回退实心圆点。
- `grid; repeat(auto-fill,minmax(240px,1fr)); gap:16px;`；卡：`border:1px solid var(--line); border-radius:var(--radius-lg)(16px); background:var(--glass-bg); box-shadow:var(--shadow-1), var(--glass-insets); padding:20px;`。
- icon 24px `var(--accent)`；标题 1rem/650 `var(--fg-0)`；描述 0.875rem `var(--fg-1)`。hover：border `--accent-line`（无位移）。

### 5.8 gallery（轨道 B，评审 #2 补入）

- 语法：`:::gallery [2|3]`（开栏参数=桌面列数，缺省 2）；条目 `- ![alt](图片地址) 说明文字`（markdown 图片 + 尾随说明）。
- 交付：Post 重写为 `<div class="ce-gallery" data-cols="n">` + `<figure class="ce-gallery__item"><a href="原图" target="_blank" rel="noopener noreferrer"><img …></a><figcaption>…</figcaption></figure>`。
- 视觉：`display:grid; grid-template-columns:repeat(var-cols,1fr); gap:12px; margin:16px 0;`（`data-cols` 映射 CSS：2/3 列；<768px 恒 1 列）；图 `border-radius:var(--radius-md)(12px); border:1px solid var(--line); width:100%; aspect-ratio:4/3; object-fit:cover;`；figcaption `margin-top:6px; text-align:center; 0.78rem var(--fg-2)`。
- **不做 lightbox**（点击=新窗看原图，scope 克制）；alt 缺省时 figcaption 兜底为空、图片必须有 alt 文本。

---

## 6. 断点与动效

### 6.1 断点表（全站仅三档）

| 断点 | 行为 |
| --- | --- |
| `<640px` | 页头紧凑（§1.6）；hero padding 收窄（现状）；卡片网格单列自然收敛；rail=overlay |
| `640–1023px` | 页头全元素；rail=overlay（抽屉 360px 封顶） |
| `≥1024px` | rail=dock（264px）；内容左移让位；GradualBlur/页头/内容对齐 rail |
| `≥1280px` | 无额外规则（hero 字号由 clamp 自适应） |

### 6.2 动效令牌

| 令牌 | 值 | 用于 |
| --- | --- | --- |
| `--ease-out-quart` | `cubic-bezier(0.22,1,0.36,1)` | rail 收展、内容偏移、通用进出 |
| `--ease-drawer` | `cubic-bezier(0.32,0.72,0,1)` | overlay 抽屉三件套（面板/scrim/底层位移） |
| `--dur-fast / base / slow` | `160 / 240 / 360ms` | hover 类 / 显隐类 / 位移类 |

存量过渡（0.18s/0.2s/0.35s 等）**不强制重写**，但新动效一律用令牌且 ≤360ms；进场编排（hero-in 0.7s + 0.08/0.16s 阶梯）保留。

### 6.3 prefers-reduced-motion 矩阵（验收逐行核对）

| 动效 | reduce 行为 |
| --- | --- |
| 极光 beam 漂移 | `animation:none`，构图静止（AuroraBackdrop.vue:123-127 现状） |
| PixelTrail / GhostCursor | **不挂载**（App.vue 条件渲染加 matchMedia 判断；比静止更省） |
| TargetCursor | `display:none`（光标动画即其本体） |
| GradualBlur | 保留静态条带（模糊是视觉层不是动画）；`data-scrolled` 显隐瞬时 |
| hero-in 进场 | `animation:none`（现状 HomePage.vue:381-387） |
| 抽屉三件套 | 瞬时显隐（§2.3/§2.5） |
| 主题切换 `.theme-fade` | 不挂类，直接跳变 |
| 卡片 hover 位移 / chevron 旋转 / 图标旋转 | `transition:none` / 直接到终态（现状均有，保持） |
| 平滑滚动（scrollIntoView/回顶） | `behavior:'auto'`（现状 FloatingActions.vue:19-20、HomePage.vue:115-117） |

### 6.4 prefers-reduced-transparency

- GlassSurface 走 `--glass-solid` 近实底分支（组件已有，GlassSurface.vue:488-494，值入 tokens §3.3）。
- `.chip-glass`、overlay rail 面板、`.doc-panel` 同步收实底：`background: var(--glass-solid)` / `var(--rail-panel-bg)` 提高到不透明（overlay 面板直接 `#070c18` / `#f4f7fc`），去 backdrop-filter。

### 6.5 指针与触屏

- `@media (hover: none)`：卡片/条目 hover 的 `translateY` 位移一律置 none（防触屏粘滞悬浮态）；色彩反馈保留。
- FAB / 页头点击目标 ≥40×40（36px 移动档可接受，已达 WCAG 2.5.8 的 24px 下限并留 8px 间距）。

---

## 7. 验收清单（合并前逐项打勾）

1. [ ] `index.html` DIRECTION CONTRACT/PRODUCT.md/tokens.css 头注释按 §0.3 修订；`npm run build` 通过。
2. [ ] 页头：单点对齐 40/36px 轴；`data-scrolled` 两态切换；GradualBlur 调用为 `target="parent" :z-index="1"`、**无** `target="page"` 残留——目检：滚动时模糊条带在胶囊**之下**、在页面内容**之上**，且 **dock 展开时条带从 rail 右缘开始、rail 顶部不被糊**（headerIssue 修复 A' + 评审 #3 验证）。
3. [ ] rail：≥1024px dock（264px、透明同面、右缘 1px 线、内容/页头 padding 走 `--rail-offset`、时间目录按年分组）；<1024px overlay（85vw/360px、scrim、底层右移缩退露圆角）；四种关闭方式全部可用；焦点圈闭/还原/inert 生效。
4. [ ] **收起几何（评审 #9）**：`.rail-collapsed` 时 rail `margin-left:-264px + visibility:hidden`（Tab 不可达，验收方式：收起后按 Tab 若干次，焦点不落入 rail）、页头与内容 padding 回 24px、条带回全宽，三者过渡同步无脱节。
5. [ ] 主题：暗色默认无闪（内联脚本）；亮色全套令牌生效；`color-scheme`/滚动条/原生控件随主题；切换无全局过渡残留（`.theme-fade` 类名与 CSS 选择器一致，评审 #12）；**theme-color meta 随手动切换更新**（评审 #7：切亮色后浏览器框应变浅）。
6. [ ] 对比度（全部经 `node` WCAG 脚本实测，复算命令：`node -e` 按 §3.2 值逐一算 `(L1+0.05)/(L2+0.05)`）：亮色 CTA hover `#ffffff on #1f56c4` ≥4.5（实测 6.59）；`--accent-2-text` 亮 `#b35310 on #f4f7fc` ≥4.5（实测 4.70）；`--accent-text` 亮 `#2b66d9` ≥4.5（实测 4.88）。
7. [ ] §3.6 A/B 表逐条落地，验收 grep（§3.6 末尾命令）**0 命中**；C 表保留项未被误改。
8. [ ] 扩展组件（§5.0 三轨道）：6 个轨道 B 组件（timeline/stat-grid/faq/steps/feature-grid/gallery）各有 PostTransformer 注册（content.ts 幂等段）+ 在 `src/content/**.extend.md` 各出现一处 `:::` 容器**语法**（条目 frontmatter 带 title+tags）；kbd 轨道 C 生效且代码块内 `{{kbd:}}` 不被替换；轨道 A 组件（TagLink/TagCloud）行为不回归。**容器内不嵌套 `:::` 容器**约定写入 BLOG.md/内容作者说明。
9. [ ] 页脚三列纵向堆叠无列头 + 无大圆角条形；条形圆角新规通过。
10. [ ] §6.3 reduced-motion 矩阵逐行核对；`prefers-reduced-transparency` 实底分支目检（含 `--glass-border-strong` 生效，评审 #13）。
11. [ ] 新动效时长全部来自 `--dur-*`/`--ease-*` 令牌（评审 #10：全文无 200/250/280/320ms 裸值）。
12. [ ] 导航高亮（评审 #15）：读文章态（/blog/:slug）页头「博客」tab 与 rail「博客」项均点亮；/notes 态「笔记」项点亮、博客项不亮。
13. [ ] 内容侧回归：`npx vite build --config src/content-system/vite.selftest.config.mjs` && `node src/content-system/.selftest-out/selftest.mjs` 通过——**注意** selftest.ts:76-95 硬编码条目数（8 条/home 4/post 3），新增 `.extend.md` 或文章必须同步该断言，否则自测必挂（勘察 risks 第 5 条）。
14. [ ] 新令牌已全部同步 `docs/CONTRACTS.md`（§0.5 表，含 `--on-accent-strong`/`--rail-offset`/`--glass-border-strong`）；z 表新行同步 App.vue 头注释；index.ts 补充导出 `mapOutsideFences` 记入 CONTRACTS「契约外补充导出」清单。
15. [ ] 玻璃目检：暗色无辉光感（rim/sheen/halo 按新值）；亮色玻璃可见（白 rim 在白底上靠 `--glass-border` 深线与阴影立住）；GlassSurface `tint='auto'` 跟随站点主题；两主题下页头品牌胶囊/hero 胶囊/FAB 目检通过。
