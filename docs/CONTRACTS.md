# docs/CONTRACTS.md — Codrift Space Site 并行开发契约

> 版本：v1.1（2026-10-24，脚手架工程师定稿；v1.1 = 集成工程师按四个模块的落地实现同步偏差，见 §2.3/§3.3/§3.4/§3.7/§3.9/§6）
> 本文件是 4 个并行工程师的**唯一对接依据**。文中所有「冻结签名」（props、函数签名、类型、导出名）修改时必须同步改本文件，并写进同一个 PR。
> 骨架已可运行：`npm run build`（= `vue-tsc --noEmit && vite build`）与 `npm run dev` 均通过脚手架验证。

---

## 0. 全局技术约定（冻结）

| 项 | 值 |
| --- | --- |
| 构建 | Vite 7（`vite.config.js`，**保持 .js 文件名**） |
| 框架 | Vue 3.5 `<script setup lang="ts">` |
| 语言 | TypeScript 5.9，strict；检查走 `vue-tsc --noEmit` |
| 路由 | vue-router 4，**hash 模式**（`createWebHashHistory`，见 `src/router/index.ts`）——不得改成 web history |
| 路径别名 | `@` → `src/`（`vite.config.js` resolve.alias） |
| `base` | `/`（域名根 codrift.space 托管，无需子路径） |
| 包管理 | npm；`package-lock.json` **必须提交**，CI 用 `npm ci` |
| 运行时依赖 | 仅：`vue`、`vue-router`、`three`、`marked`（TODO-A 已决断：不引 gsap，见 §3.9；类型包 `@types/three` 仅入 devDependencies） |

**设计基调**：类 kexie.space 高校科技风——深色近黑底、青色高光、克制的光晕与网格感，叠加**玻璃质感**（毛玻璃表面、细描边、内侧高光）。动效服务于内容，宁缺毋滥；所有动效必须尊重 `prefers-reduced-motion: reduce`（reduce 时降级为静态/直接呈现）。

**令牌用法**：所有颜色/圆角/间距/层级/字体一律引用 `src/styles/tokens.css` 的 CSS 变量（`--bg-*`、`--fg-*`、`--accent*`、`--glass-*`、`--radius-*`、`--space-*`、`--z-*`、`--font-*`），**禁止在组件里裸写颜色与间距**。玻璃质感统一取 `--glass-*` 组。新增令牌 → 改 `src/styles/tokens.css` 并同步本文件。

**层级规范**（动效层挂载点与 z-index 对应，见 `src/App.vue` 注释）：

| 层 | z-index 令牌 | 说明 |
| --- | --- | --- |
| 背景层 BackgroundLayer | `--z-bg-layer` (0) | fixed 全屏，置于 `.app-shell` 最前注释处 |
| 页面内容 router-view | `--z-content` (10) | |
| 悬浮页头 FloatingHeader | `--z-header` (100) | |
| 悬浮按钮 FloatingButton | `--z-fab` (200) | |
| 光标层 CursorLayer | `--z-cursor` (9999) | 永远最上；`pointer-events: none` |

---

## 1. 路由与页面归属（冻结）

| 路由 | name | 页面文件 | 职责 |
| --- | --- | --- | --- |
| `/` | `home` | `src/pages/HomePage.vue` | 首页（品牌主视觉 + 入口） |
| `/blog` | `blog-list` | `src/pages/BlogListPage.vue` | 博客列表（消费 §2 registry） |
| `/blog/:slug` | `blog-post` | `src/pages/BlogPostPage.vue` | 文章页（`:slug` = 内容条目 slug，消费 §2 渲染入口） |

- 路由表定义在 `src/router/index.ts`，**页面模块独占** `src/router/**`（可加路由，但上表 3 条的 path/name/文件不得变）。
- 当前三个页面为**占位组件**，页面工程师直接重写其内容，不改文件名。
- `src/App.vue` 为页面模块所有：保留 `<router-view />` 与 4 个动效层挂载注释（背景层/光标层/悬浮页头/悬浮按钮），动效组件由页面工程师挂到对应注释位置。

---

## 2. 模块 A：内容系统（`src/content-system/**` + `src/content/**`）

### 2.1 内容文件规范（`src/content/**`）

- 每个条目一个文件：`src/content/<分组>/<slug>.html`、`<slug>.md` 或 `<slug>.extend.md`。
- **slug = 文件名去扩展名**（`<slug>.extend.md` 去掉 `.extend.md`），全站唯一，即路由 `:slug`。
- **type 由扩展名决定**：`.html` → `html`；`.md` → `markdown`；`.extend.md` → `markdownWithExtend`。
- 元数据用 YAML frontmatter（文件头 `---` 包裹），字段见 2.2 的 `ContentEntry`；`title/tags` 必填，`date`（`YYYY-MM-DD`）与 `summary` 选填。

### 2.2 冻结类型（`src/content-system/types.ts`）

```ts
export type ContentType = 'html' | 'markdown' | 'markdownWithExtend';

export interface ContentEntry {
  slug: string;
  type: ContentType;
  title: string;
  tags: string[];
  date?: string;   // 'YYYY-MM-DD'
  summary?: string;
}
```

### 2.3 冻结 API（`src/content-system/registry.ts` 与 `render.ts`）

registry 基于 Vite 的 `import.meta.glob` 对 `src/content/**` 全量收集（注意：glob 模式相对**导入文件**解析，故 `registry.ts` 内写 `../content/**/*.{html,md}`，加 `{ query: '?raw', import: 'default', eager: true }` 取原始文本，frontmatter 自行解析，不引入额外依赖）：

```ts
// registry.ts
export function getAllEntries(): ContentEntry[];            // 按 date 降序，无 date 的排最后
export function getEntryBySlug(slug: string): ContentEntry | undefined;
export function getEntriesByTag(tag: string): ContentEntry[]; // 按 tag 查询（大小写敏感，按 getAllEntries 顺序）
export function getAllTags(): string[];                     // 去重后的 tag 列表

// render.ts —— 渲染入口：输入 entry，返回可直接挂载的 Vue 组件
export function renderEntry(entry: ContentEntry): Component;
// 用法：<component :is="renderEntry(entry)" />
```

渲染规则（冻结）：

- `html`：文件去掉 frontmatter 后的原文，以 `iframe srcdoc + sandbox="allow-scripts"` 隔离渲染（**不加** `allow-same-origin` → 文档落在 opaque origin，脚本触不到宿主 DOM/存储，样式天然隔离）。条目同目录的 CSS/JS 解析到源文件后内联进 srcdoc（`type="module"` 脚本与含 `</style>` 的 CSS 除外，回退 URL 引用并在 dev 告警），图片/字体等资产走构建后 URL，外链与站内绝对路径原样保留。
  > v1.0 曾写「`v-html` 或 `defineComponent` 包裹」；实测发现 Vite 7 会把 `.css?url` 并入公共样式包（条目 CSS 污染宿主页），且 `v-html` 无任何安全/样式隔离，故按实现的 iframe srcdoc 方案收敛（2026-10-24 集成同步，实现见 `src/content-system/extend/htmlFrame.ts`）。
- `markdown`：用 `marked`（已是依赖）把正文渲染为 HTML，同上挂载。
- `markdownWithExtend`：先按 `markdown` 渲染，再解析正文中的**独立一行**占位注释 `<!-- extend:组件名 -->`，替换为已注册的 Vue 组件实例。
- extend 组件**注册制**：内容系统导出 `registerExtendComponent(name: string, component: Component): void`；组件本体由页面工程师放在 `src/components/extend/**` 并在页面侧调用注册——**内容系统不得反向 import 页面代码**（边界见 §5）。注册前后渲染均安全：未注册的占位显示虚线占位框不报错，晚注册会补渲染。
- **TODO-D 定稿**（v1.0 的 v1 语法约定按内容系统实现收敛，2026-10-24）：`markdownWithExtend` 支持的内联扩展语法为
  - `:::note|warn|tip [标题] … :::` 容器（可嵌套，容器内可含代码块）；
  - `{{badge:文本|accent/warn/tip/muted}}` 徽章；
  - `{{link:url|标题|描述}}` 链接卡（仅 http(s) 与站内绝对路径）；
  - `{{tag:xxx}}` → 指向 `#/blog?tag=<encodeURIComponent(xxx)>` 的筛选链接（与 BlogListPage 的 `route.query.tag` 筛选互通）；
  以上语法对围栏代码块与行内代码保持字面文本。渲染管线可经 `registerPreTransformer` / `registerPostTransformer` 即插即用扩展。
- **扩展组件语法**（DESIGN-V2 §5 轨道 B/C，2026-10-24 增补；面向写作者的细则见 docs/BLOG.md §5）：
  - `:::timeline [标题] … :::` 条目 `- 日期 | 标题 | 描述`（标题段 `**加粗**` = 关键节点，描述可缺省）；
  - `:::stat-grid [标题] … :::` 条目 `- 数值 | 标签`（数值段 `**加粗**` = 高亮项，一屏最多一个）；
  - `:::faq [标题] … :::` 条目 `- 问题 | 答案`，渲染为可展开的 `details/summary` 组，答案含行内 markdown；
  - `:::steps [标题] … :::` 条目 `1. 标题 | 描述`（有序列表），自动编号圆片 + 虚线连接；
  - `:::feature-grid [标题] … :::` 条目 `- 图标名 | 标题 | 描述`（内置线性 SVG 十枚：bolt/book/code/star/mail/link/terminal/compass/archive/cpu，未知名回退实心圆点）；
  - `:::gallery [2|3] … :::` 条目 `- ![alt](地址) 说明文字`；开栏数字 = 桌面列数（缺省 2，<768px 恒单列），非数字开栏参数作组标题；相对图片地址经 `resolveContentUrl` 解析到 `src/content` 资产，`/` 绝对路径与外链原样；点击新窗看原图，不做 lightbox；
  - `{{kbd:A|B}}` 行内按键键帽（`|` 分隔多键自动补 `+`，单键亦可）；
  - **实现机制**：块级六件套复用 `:::` 容器机制（calloutContainersPre 抽取 + calloutRestorePost 占位回填），由 6 个 PostTransformer 把回填产物 `<section class="ce-callout ce-callout--<名>">…</section>` 重写为组件 HTML；`{{kbd}}` 为 PreTransformer（追加在 inlineTemplatesPre 之后）。转换器实现于页面侧 `src/components/extend/extend-syntax.ts`，经冻结扩展点 `registerPreTransformer` / `registerPostTransformer` 注册（该模块由 `TagCloud.vue` 顶部 import 挂进 content.ts 的加载链，先于任何 renderEntry 执行）；渲染主流程（containers.ts / render.ts / pipeline.ts）零改动。容器内 markdown 经 ctx.render 递归渲染，条目里可再用行内语法（{{badge}}/{{tag}}/{{kbd}} 等）。
  - **硬约束**：①上表六种具名容器内**不得嵌套其它 `:::` 容器**（重写按非贪婪配对，嵌套属未定义行为；`:::note/warn/tip` 不受此限）；②条目按「深度为 0 的 `|`」分段——行内代码中的 `|` 不切分，正文字面竖线写 `&#124;`；③具名容器内无可解析条目列表时退化为普通提示容器（内容不丢）；④全部组件样式在 `styles/content.css`，仅引用设计令牌与 `color-mix(令牌)` 派生，两种主题自动换肤——「主色作文字」场合用 `var(--accent-text, var(--accent))`（亮色令牌组在场时取文字安全档，缺席时退回 `--accent`）。
- 内容均为仓库自托管、可信文本，`marked` 不做 sanitize；未来若引入外部投稿必须先加净化层（届改契约）。
- **非冻结补充导出**（`index.ts`，页面可用，变更不走冻结流程）：`buildTagHref(tag: string): string`（`{{tag:xxx}}` 所用「标签 → 博客页 hash 地址」约定，页面可复用）；`registerPreTransformer` / `registerPostTransformer` 与 `PreTransformer` / `PostTransformer` 类型（渲染管线扩展点）；`mapOutsideFences` / `mapOutsideInlineCode`（代码感知扫描器，自定义行内 PreTransformer 用）；`resolveContentUrl(ref, fromDir)`（内容资产相对引用 → 构建后 URL，gallery 等组件解析图片用）。

---

## 3. 模块 B：动效（`src/effects/**`）

### 3.1 冻结导出（`src/effects/index.ts`）

```ts
export { default as GhostCursor } from './GhostCursor.vue';
export { default as PixelTrail } from './PixelTrail.vue';
export { default as TargetCursor } from './TargetCursor.vue';
export { default as GradualBlur } from './GradualBlur.vue';
export { default as GlassSurface } from './GlassSurface.vue';
export { default as GlassButton } from './GlassButton.vue';
```

组件文件名必须与导出名一致，放 `src/effects/` 下。以下 props 表为**冻结签名**；实现以上游 vue-bits 源码为基础（出处见各表注），按本契约收敛。

### 3.2 GhostCursor

上游：`vue-bits/src/content/Animations/GhostCursor/GhostCursor.vue`（本契约撰写时已抓取核对）。全量保留上游 props，无裁剪。

| prop | 类型 | 默认值 |
| --- | --- | --- |
| `trailLength` | `number` | `50` |
| `inertia` | `number` | `0.5` |
| `grainIntensity` | `number` | `0.05` |
| `bloomStrength` | `number` | `0.1` |
| `bloomRadius` | `number` | `1.0` |
| `bloomThreshold` | `number` | `0.025` |
| `brightness` | `number` | `1` |
| `color` | `string` | `'#A0FFBC'` |
| `mixBlendMode` | `CSSProperties['mixBlendMode']` | `'screen'` |
| `edgeIntensity` | `number` | `0` |
| `maxDevicePixelRatio` | `number` | `0.5` |
| `targetPixels` | `number` | 未传时内部计算（触屏 `0.9e6`，其余 `1.3e6`） |
| `fadeDelayMs` | `number` | 未传时内部计算（触屏 `500`，其余 `1000`） |
| `fadeDurationMs` | `number` | 未传时内部计算（触屏 `1000`，其余 `1500`） |
| `zIndex` | `number` | `10` |
| `className` | `string` | — |
| `style` | `CSSProperties` | — |
| `idleDrift` | `boolean` | 未传时桌面 `true` / 触屏 `false`（本仓新增） |
| `idleDelayMs` | `number` | 未传时桌面 `2200` / 触屏 `1500`（本仓新增） |
| `pixelNoise` | `boolean` | `true`（本仓新增：常驻绿色像素噪点，暗色信号绿 `#00ff55` / 亮色低饱和亮绿 `#6fdc9c`） |

全部可选。依赖 `three`（已在 dependencies）。上游 props 全量保留；`idleDrift` / `idleDelayMs`
为本仓新增的待机自主漂移开关与阈值（静止后光斑脱离光标沿准周期路径漂移、着色器转入呼吸态，
指针不在页面内时按 ~30fps 渲染；`idleDrift=false` 恢复上游静止淡出行为），`pixelNoise` 为
常驻绿色像素噪点开关（不随指针/烟雾状态消失）。三者动态读取、不触发 WebGL 重建，详见组件头注释。

### 3.3 PixelTrail

上游：`…/Animations/PixelTrail/PixelTrail.vue`（已抓取核对，其 props 定义在上游文件 10–28 行）。全量保留，无裁剪。

| prop | 类型 | 默认值 |
| --- | --- | --- |
| `gridSize` | `number` | `48` |
| `trailSize` | `number` | `0.1` |
| `maxAge` | `number` | `250` |
| `interpolate` | `number` | `5` |
| `color` | `string` | `'#ffffff'` |
| `gooeyFilter` | `{ id: string; strength: number } \| undefined` | `undefined`（不启用） |
| `className` | `string` | `''` |

> v1.1 默认值同步（2026-10-24）：实现按「明显减弱但可感知」的整站基调取 `gridSize 48 / trailSize 0.06 / maxAge 150`（上游为 40 / 0.1 / 250），并叠加容器 CSS `opacity: var(--pixel-trail-opacity, 0.4)`（上游无 opacity prop）；props 名称与类型不变。整站调用（App.vue）显式传 `gridSize 64 / trailSize 0.07 / maxAge 140`，表列默认值以本组实现为准。

依赖 `three`。

### 3.4 TargetCursor

上游：`…/Animations/TargetCursor/TargetCursor.vue`（已抓取核对，props 在上游文件 4–17 行）。全量保留，无裁剪。

| prop | 类型 | 默认值 |
| --- | --- | --- |
| `targetSelector` | `string` | `'.cursor-target'` |
| `spinDuration` | `number` | `2` |
| `hideDefaultCursor` | `boolean` | `true` |
| `hoverDuration` | `number` | `0.2` |
| `parallaxOn` | `boolean` | `true` |

> v1.1 备注（2026-10-24）：`hideDefaultCursor` 保留签名但为**受控降级**——本仓约束「组件不得直接改全局 body 样式」（§3.8 延伸），故实现不改 `document.body.style.cursor`，准星与原生光标并存；要隐藏原生光标由页面层决定。

### 3.5 GradualBlur

上游：`…/Animations/GradualBlur/GradualBlur.vue`（本地副本 `research/vue-bits/GradualBlur.vue:4-61` 已核对）。**最小必要收敛**：从上游 26 个 props 收敛到下表 11 个核心项；被裁剪项见表后说明，实现不得依赖。

| prop | 类型 | 默认值 |
| --- | --- | --- |
| `position` | `'top' \| 'bottom' \| 'left' \| 'right'` | `'bottom'` |
| `strength` | `number` | `2` |
| `height` | `string` | `'6rem'` |
| `width` | `string` | —（可选，未传按方向自适应） |
| `divCount` | `number` | `5` |
| `exponential` | `boolean` | `false` |
| `zIndex` | `number` | `1000` |
| `opacity` | `number` | `1` |
| `target` | `'parent' \| 'page'` | `'parent'` |
| `className` | `string` | `''` |
| `style` | `CSSProperties` | `{}` |

上游裁剪项（不进契约，需要时先改本文件）：`animated`、`duration`、`easing`、`curve`、`responsive` 及 `mobile/tablet/desktopHeight/Width` 六项、`preset`、`gpuOptimized`、`hoverIntensity`、`onAnimationComplete`。

### 3.6 GlassSurface

**实现参照不是上游 main，而是本项目研究变体 `research/glass/GlassSurface.vue`**（props 定义在该文件 46–110 行）：上游 `vue-bits/main` 的 `Components/GlassSurface/GlassSurface.vue`（已抓取核对）**没有 `mapScale`**，而研究变体原生支持它，且其材质默认值与下表逐项一致（变体注释还标明了每组值的设计理由）。CSS 实现路线（backdrop-filter + SVG feDisplacementMap 折射），不依赖 three。

| prop | 类型 | 默认值 | 备注 |
| --- | --- | --- | --- |
| `width` | `string \| number` | `'100%'` | 数字按 px |
| `height` | `string \| number` | `'100%'` | |
| `borderRadius` | `number \| string` | `50` | 字符串原样用（`'50%'` 正圆、`'999px'` 胶囊） |
| `borderWidth` | `number` | **`0.02`** | 边缘厚度比例，薄边 |
| `brightness` | `number` | **`50`** | 位移贴图中心亮度（%），50 = 中心不位移，勿动 |
| `opacity` | `number` | **`0.95`** | 贴图内缩亮块不透明度 |
| `blur` | `number` | **`6`** | 贴图模糊半径（px），对应令牌 `--glass-blur` |
| `mapScale` | `number` | **`4`** | 贴图分辨率除数（只影响成本） |
| `distortionScale` | `number` | **`-150`** | feDisplacementMap scale，绝对像素 |
| `displace` | `number` | **`2.0`** | 收尾 feGaussianBlur stdDeviation（边缘柔化） |
| `saturation` | `number` | **`1.4`** | 折射分支背景饱和度 |
| `backgroundOpacity` | `number` | **`0.72`** | 玻璃底色浓度，对应令牌 `--glass-bg` |
| `xChannel` / `yChannel` | `'R' \| 'G' \| 'B'` | `'R'` / `'G'` | |
| `mixBlendMode` | `string` | `'difference'` | 位移贴图通道混合（上游同名参数） |
| `tint` | `'auto' \| 'light' \| 'dark'` | `'auto'` | 玻璃底色方向（压在照片上用 dark） |
| `fill` | `string` | —（按亮暗自动） | 折射分支底色，可用 `var()` |
| `style` | `Record<string, string>` | `{}` | 与内部尺寸/背景合并，调用方优先 |

不设 `className`（`style` 已覆盖该用途）；默认插槽：玻璃表面内层内容。研究变体已内置 `prefers-reduced-transparency` 降级（收成近实底、关模糊），实现必须保留该行为。

### 3.7 GlassButton（项目自有，非上游）

基于 `GlassSurface` 的按钮组件。冻结签名：

```ts
// props（全部可选）
size?: 'sm' | 'md' | 'lg';   // 默认 'md'
href?: string;               // 传入则渲染 <a>，否则渲染 <button>
disabled?: boolean;          // 默认 false
// emits: 'click'（href 形态不拦截原生跳转）
// slot: default（按钮文案/内容）
```

视觉规格（TODO-B 已由动效工程师实现时定稿，2026-10-24 回填）：

- 尺寸档：`sm`/`md`/`lg` 高 **36/44/52px**（md = 44px 命中区档），侧 padding `--space-4/5/6`，字号 13/14/15px，文字色 `--fg-0`；
- 圆角 `var(--radius-full)` 胶囊（GlassSurface.radiusPx 夹短边一半，视觉圆角与折射贴图一致）；
- 材质不覆写：用 §3.6 GlassSurface 默认组，全站玻璃观感一致（44px 档边缘彩噪过强时由调用方在 GlassSurface 上先收 `|distortionScale|` 到 -60~-80）；
- 动效：hover 抬升 1px / active 缩放 0.98，transition 0.15s；`prefers-reduced-motion` 下关位移，只留焦点环（`--accent`）与透明度反馈；
- 禁用态：按钮形态走原生 `disabled`；链接形态走 `aria-disabled` + `pointer-events: none`。

### 3.8 通用要求

- 所有动效组件必须在 `prefers-reduced-motion: reduce` 下降级（光标类不注册监听、模糊类退化为静态遮罩）。
- 全部挂在 fixed/absolute 层的组件不得拦截鼠标事件（`pointer-events: none`），GlassSurface/GlassButton 除外。
- 组件自身样式只允许引用 `src/styles/tokens.css` 令牌或 props 传入值。

### 3.9 TODO-A：gsap 依赖（已决断，2026-10-24）

上游 `TargetCursor` 第一行 `import { gsap } from 'gsap'`，而骨架 `package.json` 依赖是冻结的四项（无 gsap）。动效工程师二选一，并在 PR 中说明：

1. `npm install gsap` 并加入 `package.json` dependencies（须同步 `package-lock.json`，属允许的依赖变更）；或
2. 用 Web Animations API / CSS 重写旋转+跟随动画，不引依赖。

**决断：取选项 2，不引 gsap。** TargetCursor 以 rAF + CSS 重写：跟随 = 指数平滑（对齐上游 0.1s power3.out retarget 手感）；角括号吸附 = strength × 帧平滑追踪目标四角；空闲自旋 = CSS animation（hover 期间复位）；按下缩放 = CSS transition。rAF 仅在未收敛/悬停追踪/回位期间运转，空闲零开销。契约依赖清单不变（§0）。

其余组件不得引入 `three`、`marked` 之外的任何新运行时依赖。

---

## 4. 模块 C：页面（`src/pages/**`、`src/router/**`、`src/App.vue`、`src/components/**`）

- 消费 §2 内容系统 API 与 §3 动效组件；**不得 import 对方内部文件**，只走各模块 `index.ts` / 冻结 API。
- 重写三个占位页面（§1 路由表），保持 path/name/文件名不变。
- 动效组件挂到 `src/App.vue` 已标注的 4 个挂载点（背景层/光标层/悬浮页头/悬浮按钮），层级用 `--z-*` 令牌。
- 通用组件放 `src/components/**`；extend 组件放 `src/components/extend/**` 并调用 `registerExtendComponent` 注册（§2.3）。

## 4.5 模块 D：CI / 内容基建（`.github/workflows/**`、`scripts/**`、`public/**`、`README.md`、`docs/BLOG.md`）

- 现状：`.github/workflows/gh-pages.yml` 是 **Jekyll 模板**（`actions/jekyll-build-pages@v1`，`source: ./`），与本 Vite 项目不匹配；改造为 Vite 部署（checkout → `npm ci` → `npm run build` → 上传 `dist/` → Pages 部署）是 CI 模块的职责，骨架未动它。
- hash 路由的好处：Pages 上无需 404 回退（`404.html` 拷贝）即可刷新/直链，CI 不必做 SPA fallback。
- `public/**` 放静态资源（favicon 等）；`docs/BLOG.md` 写内容发布流程（如何加一篇文章：§2.1 的文件规范即权威）；`scripts/**` 可放构建辅助脚本（CI 运行时 Node 22，见 `.github/workflows/deploy.yml`；脚本只用 Node ≥18 稳定 API 即两侧兼容）。

---

## 5. 文件边界（冻结，越界即返工）

| 模块 | 独占 | 他人不得触碰 |
| --- | --- | --- |
| 内容系统 | `src/content-system/**`、`src/content/**` | ✓ |
| 动效 | `src/effects/**` | ✓ |
| 页面 | `src/pages/**`、`src/router/**`、`src/App.vue`、`src/components/**` | ✓ |
| CI / 内容基建 | `.github/workflows/**`、`scripts/**`、`public/**`、`README.md`、`docs/BLOG.md` | ✓ |
| 骨架（本次已完成） | `package.json`、`package-lock.json`、`vite.config.js`、`index.html`、`tsconfig.json`、`src/main.ts`、`src/styles/**`、`src/vite-env.d.ts`、本文件 | 变更须先改契约 |
| 不可动 | `LICENSE` | ✓ |

跨模块协作只允许：页面 → 内容系统 API；页面 → 动效导出；页面 → 令牌。其余方向禁止。

## 6. 未决项（TODO 汇总）

- **TODO-A**（§3.9）：**已决断**（2026-10-24）——不引 gsap，TargetCursor 用 rAF + CSS 重写，依赖清单不变。
- **TODO-B**（§3.7）：**已回填**（2026-10-24）——GlassButton 视觉规格见 §3.7，props 签名未变。
- **TODO-D**（§2.3）：**已定稿**（2026-10-24）——`markdownWithExtend` 扩展语法与管线扩展点见 §2.3。
- **TODO-C**：webfont 未内置（字体栈当前走系统字体回退）；如需自托管字体，放 `public/**`（CI 模块边界）+ 令牌改字体栈并同步契约。
