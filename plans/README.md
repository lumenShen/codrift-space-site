# 动效审计方案索引

本目录收录 2026-10 动效审计产出的四份可执行方案（基线提交 `631cb0a`）。每份方案都是自包含的：写明了问题引用（文件:行号）、目标代码、步骤、边界与验收方式。

## 方案一览

| 编号 | 标题 | 严重度 | 状态 |
| --- | --- | --- | --- |
| 001 | 牌堆拖拽从按下瞬间的姿态接力（FeatureTag 抓取基准） | MEDIUM | TODO |
| 002 | 为笔记门户补上触屏 hover 位移守卫 | MEDIUM | TODO |
| 003 | 阅读器锚点跳转与回顶尊重 prefers-reduced-motion | MEDIUM | TODO |
| 004 | SwapText 换场改用 transition，打断时从当前透明度/模糊续走 | MEDIUM | TODO |

> 严重度取各方案文件头 `**Severity**` 字段。001 的审计原始 JSON 标为 high，确认结论降为 medium（`plans/001-feature-tag-drag-grab-base.md:69`），故表中记 MEDIUM。

- `plans/001-feature-tag-drag-grab-base.md`：修复 FeatureTag 牌堆拖拽首帧把 x/y/rotate/scale 绝对赋值导致的瞬移：在 onPointerDown 采样四根弹簧基准，拖拽改为基准叠加，松手回弹仍走 SPRING_SNAPPY（k=480/c=27/m=1）。
- `plans/002-touch-hover-guard-notes-page.md`：为 NotesPage.vue 的 8 处 hover 位移补上 @media (hover: none) 触屏守卫，只清 transform、保留色彩反馈，并让封面 hover 复位到 rotate(-2.4deg) 基态。
- `plans/003-notes-reader-reduced-motion-scroll.md`：为 NotesReader 的锚点跳转与回顶补上 prefers-reduced-motion 分支，reduce 时 behavior 改为 'auto'，正常保持 'smooth'。
- `plans/004-swaptext-interruptible-crossfade.md`：SwapText 换场从 keyframes 改为 opacity/filter transition（保留层 key 复用、新层 pending 静置 200ms、退场层各自 300ms 卸载），修复换场中途打断时旧文案跳回全不透明与退场层瞬间消失的问题。

## 推荐执行顺序

1. **003** — 改动最小（1 个文件、约 6 行），只动 `behavior` 参数，风险最低，先用它跑通「改 → `npm run build` → 手感验收」的闭环。
2. **002** — 纯 CSS 追加（`src/pages/NotesPage.vue` 内新增一个 `@media (hover: none)` 块），不改任何既有规则，回归面窄。
3. **001** — 单一源文件 `src/components/hero/FeatureTag.vue` 的四处改动（基准变量、按下采样、移动叠加、头注释），逻辑改动但 UI 契约不变。
4. **004** — 改动面最大（`src/components/hero/SwapText.vue` ≈ +80/−45 行，含 phase 状态机、双计时器与样式重写），放在最后，单独一轮 review。

顺序理由：四份方案严重度同为 MEDIUM，排序按「改动面 × 回归风险」由小到大；先做 002/003 这类几乎不可能破坏构建的改动，把注意力留给 001/004 的交互细节。

## 方案之间的依赖

- **没有令牌前置**：四份方案都明确「不新增、不修改 `src/styles/tokens.css`」的令牌（001 的 Target 段「不需要 `--dur-*` / `--ease-*` 令牌」、002 的「不引入新令牌」、003 的「不新增、不修改任何令牌」、004 的「不新增曲线、不新增令牌」）。因此不存在「共用令牌改动必须先落地」的阻塞项；若将来有人把其中某条改成令牌化，应当把它拆成独立的第一顺位方案。
- **文件不重叠，可并行**：001 只改 `src/components/hero/FeatureTag.vue`，002 只改 `src/pages/NotesPage.vue`，003 只改 `src/components/NotesReader.vue`，004 只改 `src/components/hero/SwapText.vue`，四份的 Boundaries 各自只允许动一个源文件，git diff 不会互相覆盖。
- **001 与 004 是同一条打断链路的两端，但没有代码依赖**：004 的手感验收依赖 FeatureTag 的提交节奏（`pendingTimer` 门控，最短 ≈179ms，短于 SwapText 的 200ms 延迟窗口）来复现打断；001 改的是同一组件的按下/移动写值，不触碰 `pendingTimer`、`SPRING_SNAPPY` 参数或换牌阈值。所以两者顺序可交换，只是建议在同一轮 dev server 里一起做手感验收，省一次场景搭建。
- **001 → 004 的验收提示**：004 的打断测试需要「尽可能快地连按」，而 001 修复的正是这种快速连发场景下抓取顶卡的跳变；若先做 001，004 的手感测试基线更干净（不会把拖拽瞬移误判为换场跳变）。

## 全局约束

本次审计只读，未改动任何源码；执行任一方案前，先在仓库根目录跑 `npm run build`（`vue-tsc --noEmit && vite build`）确认基线与工作区状态干净，再按方案里的 Mechanical / Feel check 逐项验收。本索引文件本身也未执行构建。
