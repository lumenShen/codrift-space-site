# 003 — 阅读器锚点跳转与回顶尊重 prefers-reduced-motion

- **Status**: TODO
- **Commit**: 631cb0a
- **Severity**: MEDIUM
- **Category**: 6. Accessibility
- **Estimated scope**: 1 个文件，`src/components/NotesReader.vue` 的 `goTo()` 内约 6 行（新增 1 行 `matchMedia` 读取，改写 2 行 `behavior` 参数）

## Problem

笔记阅读器在「同一单元内跳转」时不加判断地写死 `behavior: 'smooth'`。`src/components/NotesReader.vue:195-206` 当前实现逐字如下：

```ts
  if (next === currentIndex.value) {
    const doc = frame.value?.contentDocument;
    const target = anchor ? doc?.getElementById(anchor) : null;
    if (target) {
      target.scrollIntoView({ block: 'start', behavior: 'smooth' });
    } else {
      frame.value?.contentWindow?.scrollTo({ top: 0, behavior: 'smooth' });
    }
    loading.value = false;
    // 同一单元内的锚点只滚动、不重载 iframe；地址栏保持当前深链。
    return;
  }
```

问题在 `src/components/NotesReader.vue:199` 与 `:201` 这两行：它们分别是

```ts
      target.scrollIntoView({ block: 'start', behavior: 'smooth' });
```

```ts
      frame.value?.contentWindow?.scrollTo({ top: 0, behavior: 'smooth' });
```

两处都没有任何 `prefers-reduced-motion` 分支。本文件内只有 CSS 侧的降级（`src/components/NotesReader.vue:1212-1237`，把 `transition` / `animation` 关掉），它管不到 JS 显式传入的 `behavior: 'smooth'`；`src/styles/base.css:155-159` 的 `html { scroll-behavior: auto }` 同样覆盖不了 JS 参数，而且这里的滚动发生在 iframe 的独立文档里（`scrollIntoView` 作用于 iframe 文档中的 `target`，`scrollTo` 作用于 `contentWindow`），外层页面的 CSS 与它无关。

这条路径不是死代码，`goTo()` 同章分支至少被三处触发：

- `src/components/NotesReader.vue:305` — iframe 内点击指向当前单元的锚点链接（带 `url.hash`）；
- `src/components/NotesReader.vue:540` — 侧栏点击当前章（无 anchor，走 `:201` 回顶）；
- `src/components/NotesReader.vue:395` / `:413` — 上一单元 / 下一单元在边界或同 index 时。

（`onFrameLoad` 里的 `src/components/NotesReader.vue:246` 是 `scrollIntoView({ block: 'start' })`，未传 `behavior`，默认 `auto`，不属于本问题，不要改。）

这违反已拍板的验收矩阵：`docs/DESIGN-V2.md:705` 明确「平滑滚动（scrollIntoView/回顶） | `behavior:'auto'`」，并且 `docs/CONTRACTS.md:22` 写明「所有动效必须尊重 `prefers-reduced-motion: reduce`（reduce 时降级为静态/直接呈现）」。全站其余 5 处平滑滚动都已先读 `matchMedia`（`src/pages/NotesPage.vue:189-193`、`src/pages/HomePage.vue:234-238`、`src/components/FloatingActions.vue:19-20`、`src/components/home/swiss/PortfolioShowcase.vue:42-43`、`src/pages/ComponentLabPage.vue:308-311`），只有阅读器漏了。对本仓约定而言这是单点遗漏，而不是设计取舍：文件头注释（`src/components/NotesReader.vue:1-11`）没有为此声明任何豁免。

影响：前庭功能敏感用户按系统设置关闭动效后，在阅读器内跳小节或回顶仍会被强制播放一段横跨整篇文档的平滑滚动。

## Target

在 `goTo()` 的同章分支内，先读一次实时的媒体查询结果，再把它以三元表达式传给两个 `behavior` 参数。最终代码（整体替换 `src/components/NotesReader.vue:195-206`）：

```ts
  if (next === currentIndex.value) {
    // reduced-motion：锚点跳转与回顶直接落位，不做平滑滚动（DESIGN-V2 §6.3）
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const doc = frame.value?.contentDocument;
    const target = anchor ? doc?.getElementById(anchor) : null;
    if (target) {
      target.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
    } else {
      frame.value?.contentWindow?.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    }
    loading.value = false;
    // 同一单元内的锚点只滚动、不重载 iframe；地址栏保持当前深链。
    return;
  }
```

取值与约定固定为：

- `reduce === true` → `behavior: 'auto'`（瞬时落位，对应 `docs/DESIGN-V2.md:705` 的 reduce 行）；
- `reduce === false` → `behavior: 'smooth'`（保持现状，不降级正常用户的体验）；
- 媒体查询在**每次调用 `goTo()` 时**重新读取（不要提到模块顶层、不要改成一次性的 `const`），这样用户在系统里切换「减少动态效果」后无需刷新页面，下一次点击即生效；
- 不引入任何自定义曲线、时长或 `--ease-*` / `--dur-*` 令牌：这里的滚动由浏览器原生平滑滚动实现，没有 CSS transition/animation，`'auto'` / `'smooth'` 就是全部取值。不要为了「统一」给 iframe 滚动加 `scroll-behavior` 过渡。

## Repo conventions to follow

- 本仓对「程序化滚动 + reduced-motion」的既有写法是：在触发函数内部读一次 `window.matchMedia('(prefers-reduced-motion: reduce)').matches`，再把 `reduce ? 'auto' : 'smooth'` 直接内联进 `behavior`。照抄这个形状，不要新增 composable、不要 import 任何东西（`useMediaQuery` 是响应式的，这里每次调用都重新读，不需要它）。
- 正确示范 1（页面内滚到锚点）：`src/pages/NotesPage.vue:188-194`

  ```ts
  function scrollToLibrary(): void {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById('notes-library')?.scrollIntoView({
      behavior: reduce ? 'auto' : 'smooth',
      block: 'start',
    });
  }
  ```

- 正确示范 2（回顶）：`src/components/FloatingActions.vue:19-20`

  ```ts
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  ```

- 规则出处：`docs/DESIGN-V2.md:693`（§6.3 矩阵标题）与 `docs/DESIGN-V2.md:705`（平滑滚动行）；`docs/CONTRACTS.md:22`。
- 本仓动效令牌（`src/styles/tokens.css:165-171`）仅用于 CSS transition/animation，本方案不新增、不修改任何令牌。

## Steps

1. 打开 `src/components/NotesReader.vue`，定位 `goTo()` 的同章分支 `if (next === currentIndex.value) {`（当前位于 `:195`）。
2. 在该分支第一行（`const doc = frame.value?.contentDocument;` 之前）插入：

   ```ts
       // reduced-motion：锚点跳转与回顶直接落位，不做平滑滚动（DESIGN-V2 §6.3）
       const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
   ```

3. 把 `src/components/NotesReader.vue:199` 的

   ```ts
         target.scrollIntoView({ block: 'start', behavior: 'smooth' });
   ```

   改成：

   ```ts
         target.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
   ```

4. 把 `src/components/NotesReader.vue:201` 的

   ```ts
         frame.value?.contentWindow?.scrollTo({ top: 0, behavior: 'smooth' });
   ```

   改成：

   ```ts
         frame.value?.contentWindow?.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
   ```

5. 结果应与「Target」里的整段代码逐字一致；除这 1 行新增和 2 行改写外，不调整缩进、空行、注释或其它语句。
6. 用 `rg -n "behavior" src/components/NotesReader.vue` 自检：应只剩 `:199`、`:201` 两条，且都含 `reduce ? 'auto' : 'smooth'`；用 `rg -n "matchMedia" src/components/NotesReader.vue` 自检：应恰好命中 `goTo()` 内这 1 处。

## Boundaries

- 只改 `goTo()` 同章分支里的 `behavior` 参数和那一行 `matchMedia` 读取；不改 `goTo()` 的 index 钳制、`loading` 置位、`return`、`emit('navigate', …)` 等逻辑。
- 不动 `src/components/NotesReader.vue:246` 的 `scrollIntoView({ block: 'start' })`（本就默认 `auto`），不动 `:1212-1237` 的 CSS reduce 块，不动 `src/components/notesReaderTheme.ts`。
- 不改 `src/styles/base.css`、不改 `src/styles/tokens.css`、不改任何其它组件或页面。
- 不新增依赖、不新增 import（`window.matchMedia` 是全局 API）；不引入 `useMediaQuery`。
- 不改 markup / 结构 / 事件绑定 / 文案。
- 如果打开文件后发现 `:199` / `:201` 的内容与上面引用的不一致，或 `goTo()` 里已经出现 `matchMedia`，视为基线漂移：**停止改动并在交付说明里写明漂移位置**，不要自行推断新写法。
- 只允许落盘这一个方案文件本身；执行时也只允许改 `src/components/NotesReader.vue` 一个源文件。

## Verification

- **Mechanical**:
  - `npm run build`（脚本为 `vue-tsc --noEmit && vite build`，见 `package.json`）→ 期望通过，无类型错误、无构建报错。
  - `rg -n "behavior" src/components/NotesReader.vue` → 期望恰好 2 行（`:199`、`:201`），均为 `reduce ? 'auto' : 'smooth'`。
  - `rg -n "matchMedia" src/components/NotesReader.vue` → 期望恰好 1 行，位于 `goTo()` 内。
  - `git diff --stat` → 期望只列出 `src/components/NotesReader.vue`。
- **Feel check**: `npm run dev` 启动后进入 `/notes`，打开任一笔记集，按下面逐项看：
  - **正常模式（未开 reduce）**：在阅读器内点小节锚点、点侧栏里的当前章（走回顶）、以及在首/末单元点上一个/下一个（同 index 情形），正文应从当前位置平滑滑到目标或顶部；外层页面（页头、侧栏）不得跟着滚动，滚动只发生在 iframe 内。
  - **Rendering 面板 → Emulate CSS media feature `prefers-reduced-motion: reduce`**：重复上述三种触发，必须**瞬时落位**——无中间帧、无滑行尾巴；同时确认其余反馈未被误伤：焦点环仍在、侧栏按钮 hover 颜色仍变、iframe 内容不消失。
  - **不刷新页面切换** Rendering 面板里的 reduce 开关，再点一次回顶/锚点：行为应随最新设置立即改变，证明每次调用都重新读了媒体查询。
  - **DevTools Animations 面板调到 10% 播放速度**：注意原生平滑滚动不会被这个面板放慢（它不是 CSS/WAAPI 动画），所以这里要确认的是「滚动期间没有新增任何 reader 自身的 transition/animation 行」——面板里只应出现既有的阅读器过渡（如 frame 淡入），不应出现与被点击滚动同步的动画条目；若出现，说明有人用 CSS 过渡重写了滚动，属于偏离本方案。
  - **快速反复触发（打断）**：连续快速点击不同小节锚点以及回顶，滚动应每次都从当前视觉位置重新指向新目标，不排队、不抖动、不停在半路；最后一次点击的目标必须最终到位。在 reduce 下快速连点则每次都是瞬跳，不应出现残留滚动。
- **Done when**:
  - `npm run build` 通过，且 `rg` 自检输出与上文一致；
  - reduce 模拟下，锚点跳转与回顶为瞬跳，正常模式下仍为平滑滚动；
  - 页头/侧栏/外层文档在阅读器滚动时保持静止；
  - `git diff` 只包含 `src/components/NotesReader.vue` 中 `goTo()` 同章分支的上述改动。
