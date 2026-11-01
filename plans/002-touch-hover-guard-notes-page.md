# 002 — 为笔记门户补上触屏 hover 位移守卫

- **Status**: TODO
- **Commit**: 631cb0a
- **Severity**: MEDIUM
- **Category**: 6. Accessibility
- **Estimated scope**: 1 个文件（`src/pages/NotesPage.vue`），纯 CSS 追加约 22 行，不改任何已有规则

## Problem

`src/pages/NotesPage.vue` 是笔记门户页（`/notes`）。这一页有 8 处 `:hover` 会改动 `transform`，但整个文件没有 `@media (hover: none)` 守卫（`grep -n "hover: none\|pointer: coarse" src/pages/NotesPage.vue` 无输出；全文件 `@media` 只有 1341、1355、1387 三个断点和 1436 的 reduced-motion）。

触屏设备上点按后 `:hover` 会被保持（sticky hover），卡片停在抬升/正立态不再复位。尤其明显的是：阅读器是 Teleport 覆盖层（`NotesReader.vue:349-352`，`v-if="open && collection"`），门户本身不卸载，所以「点卡片 → 打开阅读器 → 关闭」之后卡片永久停在 `-3px` + 高亮边框态，和旁边卡片不一致；封面也会从基态 `rotate(-2.4deg)` 变成正立。

8 处位移全部逐字存在于以下位置：

```css
/* src/pages/NotesPage.vue:642 — current */
.notes-cta:hover {
  background: var(--accent-strong);
  border-color: var(--accent-strong);
  transform: translateY(-1px);   /* 645 */
}

/* src/pages/NotesPage.vue:659 — current */
.notes-ghost:hover {
  border-color: var(--accent-line);
  color: var(--accent-strong);
  transform: translateY(-1px);   /* 662 */
}

/* src/pages/NotesPage.vue:735 — current */
.cover-tile:hover .cover-image {
  transform: translateY(-6px);   /* 736 */
  filter: brightness(1.03);
}

/* src/pages/NotesPage.vue:846 — current */
.note-card:hover {
  transform: translateY(-3px);   /* 847 */
  border-color: color-mix(in srgb, var(--note-accent) 42%, var(--line));
  box-shadow: var(--shadow-2), var(--glass-insets);
}

/* src/pages/NotesPage.vue:904 — current */
.note-preview:hover .note-stage-cover {
  transform: rotate(0deg) translateY(-5px) scale(1.02);   /* 905 */
  filter: brightness(1.04);
}

/* src/pages/NotesPage.vue:1073 — current */
.note-read:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);   /* 1075 */
}

/* src/pages/NotesPage.vue:1088 — current */
.note-download:hover {
  border-color: var(--accent-line);
  color: var(--accent-strong);
  transform: translateY(-1px);   /* 1091 */
}

/* src/pages/NotesPage.vue:1269 — current */
.offline-link:hover {
  transform: translateY(-2px);   /* 1270 */
  border-color: var(--accent-line);
  background: var(--bg-2);
  color: inherit;
}
```

封面舞台的**基态**是倾斜的，必须原样保留：

```css
/* src/pages/NotesPage.vue:895 — current */
.note-preview .note-stage-cover {
  width: auto;
  height: 76%;
  transform: rotate(-2.4deg);   /* 898 */
  transition:
    transform 0.5s var(--ease-out-quart, cubic-bezier(0.22, 1, 0.36, 1)),
    filter 0.3s ease-out;
}
```

因此触屏守卫不能简单写 `.note-preview:hover .note-stage-cover { transform: none }`——那会把基态倾角一起压平。必须写成 `transform: rotate(-2.4deg)`。

为什么该修：`docs/DESIGN-V2.md:714`（§6.5）已明文拍板「`@media (hover: none)`：卡片/条目 hover 的 `translateY` 位移一律置 none（防触屏粘滞悬浮态）；色彩反馈保留」，且该稿把 `NotesPage.vue` 列在覆盖范围内。仓库里 `BlogCard.vue:100-106`、`PortfolioCard.vue:229`、`BlogListPage.vue:258-263`、`FeatureTag.vue:770` 都已照做，本页是漏做，不属有意取舍。

## Target

在 `src/pages/NotesPage.vue` 的 `@media (prefers-reduced-motion: reduce)` 块（当前 1436 行）**之前**插入以下整块，文件其余部分一字不改：

```css
/* 触屏：hover 位移置 none 防粘滞悬浮态，色彩反馈保留（DESIGN-V2 §6.5） */
@media (hover: none) {
  .cover-tile:hover .cover-image,
  .notes-cta:hover,
  .notes-ghost:hover,
  .note-card:hover,
  .note-preview:hover .note-stage-cover,
  .note-read:hover,
  .note-download:hover,
  .offline-link:hover {
    transform: none;
  }

  /* 基态是 rotate(-2.4deg)，只去掉抬升与放大，回到底角倾斜 */
  .note-preview:hover .note-stage-cover {
    transform: rotate(-2.4deg);
  }
}
```

要点：

- 覆盖全部 8 个带位移的 `:hover` 选择器，一个不多一个不少。
- `.note-card:hover` 的 `border-color` / `box-shadow`、`.notes-cta:hover` 的 `background` / `border-color`、`.notes-ghost:hover` 的 `color` / `border-color`、`.note-read:hover` 与 `.note-preview:hover .note-stage-cover` 的 `filter`、`.cover-tile:hover .cover-image` 的 `filter`、`.offline-link:hover` 的 `border-color` / `background` 全部保留——只清 `transform`。
- 第二条覆盖规则必须排在第一条之后（同优先级，后者生效），或至少保证它在 `@media` 块内位于 `.note-preview:hover .note-stage-cover` 的选择器之后。
- 不引入新令牌、不新增时长、不改任何 `transition` 值（本页既有 `0.16s/0.18s/0.22s/0.28s/0.5s` 属 `docs/DESIGN-V2.md:691` 豁免的存量过渡，不重写）。
- `.notes-cta:active`（648 行）的 `translateY(0) scale(0.98)` 是按压反馈，不是 hover，保持不动。

## Repo conventions to follow

仓库已有 4 处正确示范，统一写法是「业务规则之后、reduced-motion 之前」放一个独立 `@media (hover: none)` 块，只清 `transform`，并带同一句注释：

```css
/* src/components/BlogCard.vue:100 — 已有正确示范 */
/* 触屏：hover 位移置 none 防粘滞悬浮态，色彩反馈保留（DESIGN-V2 §6.5） */
@media (hover: none) {
  .post-card:hover {
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .post-card {
    transition: none;
  }

  .post-card:hover {
    transform: none;
  }
}
```

同款：`src/pages/BlogListPage.vue:258-263`（断点之后、reduced-motion 之前）、`src/components/PortfolioCard.vue:229`、`src/components/hero/FeatureTag.vue:770`。

新块在 `NotesPage.vue` 中的位置照 `BlogListPage.vue` 的次序：放在最后一个响应式断点 `@media (max-width: 640px)` 闭合之后、`@media (prefers-reduced-motion: reduce)` 之前。

## Steps

1. 打开 `src/pages/NotesPage.vue`，定位到 1434 行的 `}`（它闭合 1387 行开始的 `@media (max-width: 640px)` 块）与 1436 行的 `@media (prefers-reduced-motion: reduce) {` 之间的空行（1435）。

2. 在该空行处插入下面的整块（即 Target 中的代码，缩进为文件顶格、内部两空格），插入后 1434 行之后应为：

```css
@media (max-width: 640px) {
  /* … 原有内容不动 … */
  .notes-end {
    align-items: flex-start;
    flex-direction: column;
  }
}

/* 触屏：hover 位移置 none 防粘滞悬浮态，色彩反馈保留（DESIGN-V2 §6.5） */
@media (hover: none) {
  .cover-tile:hover .cover-image,
  .notes-cta:hover,
  .notes-ghost:hover,
  .note-card:hover,
  .note-preview:hover .note-stage-cover,
  .note-read:hover,
  .note-download:hover,
  .offline-link:hover {
    transform: none;
  }

  /* 基态是 rotate(-2.4deg)，只去掉抬升与放大，回到底角倾斜 */
  .note-preview:hover .note-stage-cover {
    transform: rotate(-2.4deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .cover-image,
  /* … 原有内容不动 … */
```

3. 逐条对照确认 8 个选择器均已覆盖且拼写与源规则一致：`.cover-tile:hover .cover-image`（735）、`.notes-cta:hover`（642）、`.notes-ghost:hover`（659）、`.note-card:hover`（846）、`.note-preview:hover .note-stage-cover`（904）、`.note-read:hover`（1073）、`.note-download:hover`（1088）、`.offline-link:hover`（1269）。若发现任一选择器与上表行号不符，按 Boundaries 停下并报告漂移。

4. 确认第 2 条规则 `transform: rotate(-2.4deg);` 存在（与 898 行基态同值），不要写成 `none`。若选择器顺序被调整，确保它位于通用 `transform: none` 之后。

5. 不要改动 1436 行开始的 `@media (prefers-reduced-motion: reduce)` 块。该块中 `.note-preview:hover .note-stage-cover { transform: none }`（1446）会把基态倾角压平，这是既有行为，不在本次范围内；同样不要借机修改。

## Boundaries

- 只允许修改 `src/pages/NotesPage.vue`，且只做**追加**：在 1434 与 1436 之间插入新的 `@media (hover: none)` 块。
- 不修改任何已有规则的 `transform` / `transition` / 颜色值，不改选择器顺序，不改 `@media (prefers-reduced-motion: reduce)` 块，不改 `<script>` 与 `<template>`。
- 不动结构、不动文案、不动类名。
- 不新增依赖，不引入新令牌（本方案不需要任何曲线或时长）。
- **漂移处理**：如果 `src/pages/NotesPage.vue` 中上述 8 个选择器缺任何一个、多出新的 hover 位移、或行号/内容与本文不符，停止编辑并在报告中写明差异，不要自行补写或改写既有过渡。
- 不顺手做 `0.16s/0.18s/0.22s/0.28s/0.5s` 的令牌化（`docs/DESIGN-V2.md:691` 明确存量豁免），也不改 `620ms` 之类的其他文件问题。

## Verification

- **Mechanical**: 在仓库根目录运行

  ```
  npm run build
  ```

  期望：构建通过，无 Vue/CSS 报错（纯 CSS 追加不应影响产物）。

  另跑一条定位检查确认块已落位且选择器齐全（Git Bash）：

  ```
  grep -n "hover: none" src/pages/NotesPage.vue
  grep -n "rotate(-2.4deg)" src/pages/NotesPage.vue
  ```

  期望：第一条输出 1 行（新块），第二条输出 2 行（898 行基态 + 新增守卫）。

- **Feel check**: 运行 dev server，打开 `/notes`，用 DevTools 设备工具栏切到触屏模拟（或 Rendering 面板勾选 `Emulate CSS media feature hover: none`）：

  - **点按封面（cover shelf）后手指抬起**：封面应停留在倾斜基态 `rotate(-2.4deg)`，不保持 `-6px` 抬升，也不变成正立放大；`filter: brightness(1.03)` 若短暂出现即回落属正常。
  - **点卡片 → 阅读器打开 → 关闭**：卡片必须回到无位移、无高亮边框的基态（`border-color` 回到 `var(--line)`、`box-shadow` 回到 `--shadow-1`），而不是永久停在 `-3px`；卡片内封面同样回到倾斜态。
  - **笔记卡内的「阅读」「下载」按钮、页内 `.offline-link`、hero 的 `.notes-cta` / `.notes-ghost`**：点按后都不残留位移；颜色/边框变化仍要看得见（色彩反馈必须保留，别把整条规则删掉）。
  - **Animations 面板 10% 慢放**：在触屏模拟下点按封面，时间轴里**不应出现** `.cover-image` / `.note-card` 的 transform 过渡（守卫直接让值不变化）；切回桌面鼠标 hover，同一元素仍能看到 `-6px` / `-3px` 的位移过渡，说明没有误伤桌面端。
  - **混合设备（带触屏的笔记本）**：`@media (hover: none)` 只在主指针不能 hover 时命中，桌面 hover 行为应完全不变——用鼠标悬停确认位移仍在。
  - **快速反复触发**：在卡片上连续快速点按/移入移出，确认既没有卡住的高亮态，也没有动画从零重启的跳变（`.note-card` 用 transition，会从当前值 retarget）。
  - **Rendering 面板勾选 `prefers-reduced-motion: reduce`**：桌面 hover 时位移应被既有 1436 行块清掉，但颜色/边框反馈仍在；与本次新增的触屏守卫叠加时结果一致（两处都是清 `transform`）。

- **Done when**: `npm run build` 通过；`grep -n "hover: none" src/pages/NotesPage.vue` 恰好一行且位于 reduced-motion 块之前；触屏模拟下 8 处交互点按后均无残留位移，关闭阅读器后卡片与邻卡状态一致；桌面鼠标 hover 的 `-6px` / `-3px` 位移与颜色反馈保持不变。
