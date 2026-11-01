# 001 — 牌堆拖拽从按下瞬间的姿态接力（FeatureTag 抓取基准）

- **Status**: TODO
- **Commit**: 631cb0a
- **Severity**: MEDIUM
- **Category**: 4. Interruptibility
- **Estimated scope**: 1 个文件（`src/components/hero/FeatureTag.vue`），约 +16 行新增、0 行删除逻辑（4 行写入替换为基准版），无样式与模板改动

## Problem

`src/components/hero/FeatureTag.vue` 的牌堆拖拽在第一次 `pointermove` 时，把 x / y / rotate 三个弹簧直接写成「指针相对按下点的增量」，scale 写成常量基准 `1`。代码原文：

```ts
/* src/components/hero/FeatureTag.vue:330-346 — current */
function onPointerDown(event: PointerEvent, id: string, depth: number): void {
  if (depth !== 0 || id !== props.activeId) return;
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  const el = event.currentTarget as HTMLElement | null;
  if (!el) return;

  pointerId = event.pointerId;
  dragId = id;
  startX = lastX = event.clientX;
  startY = lastY = event.clientY;
  moved = false;
  suppressClick = false;
  isDragging.value = true;
  velocity.reset(event.clientX, event.clientY, event.timeStamp);
  el.setPointerCapture(event.pointerId);
  stopAutoplay();
}
```

`onPointerDown` 只记录 `startX` / `startY`，没有读取 `motion.x/y/scale/rotate` 的任何当前值。紧接着：

```ts
/* src/components/hero/FeatureTag.vue:363-370 — current */
  const motion = motionOf(dragId);
  // 拖拽期间直接跟随手指（弹簧在松手时才接管），倾角与抬升保持物理直觉。
  // 顶卡静止时保持水平，倾角只由水平位移临时驱动，松手后回到 0°。
  motion.x.set(dx);
  motion.y.set(dy);
  motion.rotate.set(clamp(dx * 0.06, -10, 10));
  const lift = Math.min(1, Math.hypot(dx, dy) / Math.max(60, size.width || 96));
  motion.scale.set(1 + lift * 0.05);
```

`SpringValue.set()` 的语义是「瞬时置值、清零速度、退出 rAF」（`src/effects/useSpring.ts:131-138`）：

```ts
/* src/effects/useSpring.ts:131-138 — current */
  /** 瞬时置值（目标同步、清零速度、停止动画） */
  set(value: number): void {
    this.value = value;
    this.target = value;
    this.velocity = 0;
    this.leave();
    this.emit();
  }
```

因此只要按下时这张牌还在弹簧运行中，第一次 `pointermove`（1px 即可；`set()` 三行位于 `moved` 死区判断之外）就会把它从飞行/回弹姿态**瞬移**到「指针增量」处。可达路径有两条：

1. **未过阈值的拖拽 → 松手回弹 → 约 270ms 内二次抓取。** 阈值是 `clamp(卡宽 × 0.32, 24, 64)`（`FeatureTag.vue:314-316`），松开后 `x/y/rotate/scale` 各自 `setTarget(pose(0))` 并注入半速（`FeatureTag.vue:412-423`）。回弹到 2% 带约需 270ms（`stackMotion.ts:15-21` 的 `SPRING_SNAPPY` 注释）。此窗口内再按住并移动 1px，`set(dx)` 会把牌从当前最多 24–64px 的位移直接拉回 1px —— 这是最大、也最容易复现的跳变。
2. **换牌入位途中抓住新顶卡。** 换牌后 `applyTargets()` 走 `setTarget`（`FeatureTag.vue:284-290`），新顶卡的 scale 从上一层的 `stackPose` 值飞向 1：向前换牌来自 depth 1（`1 - 0.055 = 0.945`），向后换牌/绕回时来自 depth 4（`0.78`，`stackMotion.ts:36-37,60`）。`motion.scale.set(1 + lift * 0.05)` 把基准写死为 1，抓到正在入位的牌会瞬跳最多约 22% 缩放；同一时刻 x/y/rotate 也各自被重置。

这张牌只有 depth 0 可交互（`FeatureTag.vue:653` 的 `:disabled="card.depth > 0"` 与 `:661` 的 `@pointerdown`，加上 `onPointerDown` 开头的 depth 判断），所以桌面鼠标的换牌飞行窗口较短；但上述路径 1 在鼠标与触屏上都能稳定触发。组件头注释明确承诺「按下 1:1 跟手……手指在哪卡在哪」（`FeatureTag.vue:15-16`），与「从 0 重写」的实现冲突，说明不是有意为之。

严重度说明：发现 JSON 的 `severity` 写作 high，`confirmedSeverity` 与 confirmerNote 的实测结论为 **medium**（换牌飞行窗口的可见跳变约 30–50ms、100ms 内基本结束）。本方案按 medium 执行，但修复动作不因优先级而简化。

## Target

按下瞬间读取四根弹簧的当前值作为基准，拖拽位移在基准上叠加；松手后的回弹完全交给既有弹簧，**不新增曲线、不新增令牌、不改弹簧参数**。

```ts
/* src/components/hero/FeatureTag.vue — target（插入后行号整体下移，按内容对齐） */
let dragId: string | null = null;
let pointerId: number | null = null;
let startX = 0;
let startY = 0;
/** 按下瞬间各弹簧的当前值：拖拽位移以此为基准叠加，飞行/回弹中的牌被抓住也不跳 */
let grabX = 0;
let grabY = 0;
let grabScale = 1;
let grabRotate = 0;
let lastX = 0;
let lastY = 0;
```

```ts
/* src/components/hero/FeatureTag.vue — onPointerDown target */
function onPointerDown(event: PointerEvent, id: string, depth: number): void {
  if (depth !== 0 || id !== props.activeId) return;
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  const el = event.currentTarget as HTMLElement | null;
  if (!el) return;

  // 抓住哪算哪：记下此刻四根弹簧的当前值。换牌后顶卡可能还在入位飞行中，
  // 未过阈值的拖拽也可能正在回弹；若位移从 0 起算，第一次 pointermove
  // 就会把牌瞬移到指针增量处。基准化后手势从当前姿态无缝接管。
  const motion = motionOf(id);
  grabX = motion.x.value;
  grabY = motion.y.value;
  grabScale = motion.scale.value;
  grabRotate = motion.rotate.value;

  pointerId = event.pointerId;
  dragId = id;
  startX = lastX = event.clientX;
  startY = lastY = event.clientY;
  moved = false;
  suppressClick = false;
  isDragging.value = true;
  velocity.reset(event.clientX, event.clientY, event.timeStamp);
  el.setPointerCapture(event.pointerId);
  stopAutoplay();
}
```

```ts
/* src/components/hero/FeatureTag.vue — onPointerMove target */
function onPointerMove(event: PointerEvent): void {
  if (pointerId !== event.pointerId || !dragId) return;
  const dx = event.clientX - startX;
  const dy = event.clientY - startY;
  lastX = event.clientX;
  lastY = event.clientY;
  velocity.sample(event.clientX, event.clientY, event.timeStamp);

  if (!moved && Math.hypot(dx, dy) > DRAG_DEAD_ZONE) {
    moved = true;
    // 真正进入拖拽：取消未提交的换牌，并清掉还在回弹的下压量，保证 1:1 跟手
    cancelPendingAdvance();
    motionOf(dragId).press.set(0);
  }

  const motion = motionOf(dragId);
  // 拖拽期间直接跟随手指（弹簧在松手时才接管）：位移叠加在按下瞬间的姿态上，
  // 而不是从 0 重写——飞行或回弹中的牌不会被拽回原点。
  // 顶卡静止时保持水平，倾角只由水平位移临时驱动，松手后回到 0°。
  motion.x.set(grabX + dx);
  motion.y.set(grabY + dy);
  motion.rotate.set(grabRotate + clamp(dx * 0.06, -10, 10));
  const lift = Math.min(1, Math.hypot(dx, dy) / Math.max(60, size.width || 96));
  motion.scale.set(grabScale + lift * 0.05);
}
```

固定数值与归属（照抄，不要改）：

- 弹簧：`SPRING_STACK`，即 `SPRING_SNAPPY`，`k=480 / c=27 / m=1`（`src/components/hero/stackMotion.ts:21`、`src/effects/useSpring.ts:37-44`），ζ≈0.616、过冲≈7.6%、≈179ms 到峰、≈270ms 回 2% 带。
- 积分与静止判据沿用 `useSpring` 默认：1/240s 子步、单帧 dt 钳制 64ms、precision 见 `FeatureTag.vue:164-169`（x/y 0.05、rotate 0.01、scale 0.0005、opacity 0.001、press 0.01）。
- 倾角临时增量仍为 `clamp(dx * 0.06, -10, 10)`（最多 ±10°），抬升仍为 `lift * 0.05`（最多 +5%），死区 `DRAG_DEAD_ZONE = 4`、阈值 `OFFSET_RATIO = 0.32`、`FLING_RATIO = 4.2` 全部不变。
- **本方案不涉及 CSS 过渡，不需要 `--dur-*` / `--ease-*` 令牌**：位移由 `SpringValue` 逐帧写 `transform`（`FeatureTag.vue:140-148`），弹簧预设就是这里的「曲线」。不要改成 CSS transition，也不要新增令牌。
- 静止时 `grabX = 0 / grabY = 0 / grabScale = 1 / grabRotate = 0`，与旧代码完全等价 —— 常规拖拽的路径零回归。

## Repo conventions to follow

- **「绝对值 = 基准 + 偏移」的写法本仓已有先例**：`src/components/hero/FeatureTag.vue:144-147` 在写 DOM 时把 `motion.y.value + motion.press.value` 合成一个纵向位移，而不是在弹簧里互相覆盖。本次修复照这个模式，把「基准」换成按下瞬间采样：

  ```ts
  /* src/components/hero/FeatureTag.vue:144-146 — 正确的合成示范 */
      el.style.transform =
        `translate3d(${motion.x.value.toFixed(2)}px, ${(motion.y.value + motion.press.value).toFixed(2)}px, 0) ` +
        `rotate(${motion.rotate.value.toFixed(2)}deg) scale(${motion.scale.value.toFixed(4)})`;
  ```

- **弹簧参数只有一个来源**：`src/components/hero/stackMotion.ts:21` 的 `export const SPRING_STACK: SpringConfig = SPRING_SNAPPY;`。组件里永远不要内联 `stiffness/damping` 数字，本次也不新增预设。
- **reduced-motion 由 `useSpring` 统一兜底**：`src/effects/useSpring.ts:140-149`（`setTarget()` 在 reduced 时 `snap()`）与 `:151-156`（`kick()` 忽略速度）。`set()` 无论偏好都瞬时置值，正是拖拽直写需要的语义；**不要在 `FeatureTag.vue` 里再加 `reducedMotion` 分支**。
- **依赖冻结**：运行时仅 `vue`、`vue-router`、`three`、`marked`（`docs/CONTRACTS.md:20`），本次不新增任何包。
- **组件自述即契约**：`FeatureTag.vue:15-16` 承诺「按下 1:1 跟手……手指在哪卡在哪」，本次修复就是让实现追上这句话。

## Steps

1. **`src/components/hero/FeatureTag.vue:307`** —— 在 `let startY = 0;` 之后插入四个模块级基准变量（位于 `let lastX = 0;` 之前），得到 Target 中的 `:304-312` 整段：

   ```ts
   /** 按下瞬间各弹簧的当前值：拖拽位移以此为基准叠加，飞行/回弹中的牌被抓住也不跳 */
   let grabX = 0;
   let grabY = 0;
   let grabScale = 1;
   let grabRotate = 0;
   ```

2. **`src/components/hero/FeatureTag.vue:330-346`（`onPointerDown`）** —— 在 `if (!el) return;` 之后、`pointerId = event.pointerId;` 之前，读取当前姿态快照：

   ```ts
   const motion = motionOf(id);
   grabX = motion.x.value;
   grabY = motion.y.value;
   grabScale = motion.scale.value;
   grabRotate = motion.rotate.value;
   ```

   函数其余行（指针捕获、`startX/startY`、`velocity.reset`、`stopAutoplay`）原样不动。

3. **`src/components/hero/FeatureTag.vue:363-370`（`onPointerMove` 尾部）** —— 把四次 `set()` 改为「基准 + 增量」：

   ```ts
   const motion = motionOf(dragId);
   // 拖拽期间直接跟随手指（弹簧在松手时才接管）：位移叠加在按下瞬间的姿态上，
   // 而不是从 0 重写——飞行或回弹中的牌不会被拽回原点。
   // 顶卡静止时保持水平，倾角只由水平位移临时驱动，松手后回到 0°。
   motion.x.set(grabX + dx);
   motion.y.set(grabY + dy);
   motion.rotate.set(grabRotate + clamp(dx * 0.06, -10, 10));
   const lift = Math.min(1, Math.hypot(dx, dy) / Math.max(60, size.width || 96));
   motion.scale.set(grabScale + lift * 0.05);
   ```

   不要动 `motionOf(dragId).press.set(0)`（`:360`）及其上游注释；不要动 `endDrag()` / `onPointerCancel()`：它们已经在松手/取消时把目标设回 `stackPose(0)`，基准化后的拖拽值仍会正常回弹到 0/0/0°/1。

4. **`src/components/hero/FeatureTag.vue:15-16`（头注释）** —— 同步说明基准来源，防止后人改回绝对赋值：

   ```ts
    *  - 按下 1:1 跟手：直接写 SpringValue 的当前值，不加弹性延迟，手指在哪卡在哪；
    *    基准是按下瞬间四根弹簧的当前值（grabX/grabY/grabScale/grabRotate），
    *    位移在其上叠加而不是从 0 重写——换牌入位或回弹途中抓牌也不会瞬移；
    *    水平位移同时驱动倾角（±10°）与轻微抬升（最多 +5%），形成「捏起一张牌」。
   ```

## Boundaries

- 只改 `src/components/hero/FeatureTag.vue`。不要动 `src/effects/useSpring.ts`、`src/components/hero/stackMotion.ts`、任何 CSS 文件，也不要动 `<template>` 与 `<style>`。
- 只改动效相关属性：四根弹簧的写入值与基准变量。不改结构、不改类名、不改事件绑定。
- 不改弹簧参数（`SPRING_SNAPPY` k=480/c=27/m=1）、precision、积分步长；不新增 CSS 令牌、不新增 `transition`/`animation`。
- **不要把拖拽改成 `setTarget()`**：那会引入弹性延迟，违背「1:1 跟手」；直写 `set()` 是刻意的。
- 不要顺手改 `motionOf(dragId).press.set(0)`（`FeatureTag.vue:356-361`）：注释写明这是「清掉还在回弹的下压量」的有意行为，属于另一次发现，不在本方案范围。
- 不要新增依赖（`docs/CONTRACTS.md:20,282`），不要引入 gsap。
- 漂移检查：若 `FeatureTag.vue:330-346` 或 `:363-370` 与上文逐字引用不一致（行号漂移可以，代码内容必须一致），**停下并在 PR/交付说明里写明漂移**，不要即兴改别的实现。

## Verification

- **Mechanical**: 在仓库根目录运行 `npm run build`（脚本为 `vue-tsc --noEmit && vite build`，`package.json:8`），期望类型检查与构建全部通过、无新增告警。本方案写作时未执行该命令（任务约束只允许写方案文件）。
- **Feel check**: 运行 `npm run dev`，打开首页 hero 的牌堆。
  - **回弹中二次抓取（核心场景）**：拖住顶卡横移约 20px（卡宽约 100px 时阈值约 32px，确保不换牌），松手，在约 150ms 内立刻重新按住并移动 1px。卡片必须停在它此刻所在的位置附近，**不能瞬移回指针增量处**；修复前会看到约 20px 的横跳。重复 5 次都要跟手。
  - **换牌入位中抓取**：快速甩出一张牌完成换牌，紧接着（约 100ms 内）按住新顶卡拖动 1px。新卡应从它当前较小的 scale（depth 1 约 0.945，绕回时 depth 4 约 0.78）平滑放大到拖拽姿态，不能一次跳到 1；y 方向同理不应跳。
  - **打断与可逆**：按住拖动 → 反向拖动 → 松手；再按住 → 再松手，连续 5 轮。每一轮第一帧都不得出现「牌从手指下弹走」，松手后仍能沿注入速度回弹（未过阈值）或甩出换牌（过阈值）。
  - **不回归**：原地点击（位移 < 4px）仍换牌；拖拽超过阈值后松手不触发 click 换牌（`suppressClick` 生效）；Enter/Space 与方向键换牌、焦点转移不受影响。
  - **DevTools → Animations 面板**：把 playback rate 调到 10%。该面板只接管 CSS 动画/过渡，本组件里被它捕获的只有 `.ft-card` 的 `filter var(--dur-slow) cubic-bezier(0.34, 1.4, 0.5, 1)`（`FeatureTag.vue:717`）——确认换牌时虚化是从当前 depth 继续过渡、而不是重新起播；弹簧位移不在该面板里，慢放要看它就用 Performance 面板录 3–5s（观察每帧 `transform` 写入，相邻帧位移不应出现一次性几十 px 的台阶），或系统录屏后 0.1× 回放。
  - **DevTools → Rendering → Emulate CSS media feature `prefers-reduced-motion: reduce`**：自动轮播停止；按住拖动仍即时跟手（无弹性滞后）；松手瞬间归位（`setTarget` 退化为 `snap()`），没有残余动画；在牌堆静止时抓取不产生任何位移。
  - **触屏（或 DevTools 设备模拟 touch）**：手指按住后横向滑动，卡片必须从按住时的姿态起跟手，不闪回原位；`touch-action: none` 仍只作用于顶卡。

- **Done when**: `npm run build` 通过；上述「回弹中二次抓取」与「换牌入位中抓取」两条目检均无瞬移；`git diff` 只包含 `src/components/hero/FeatureTag.vue` 的四处改动（变量声明、`onPointerDown` 快照、`onPointerMove` 四行写入、头注释），无依赖变化、无 CSS 变化；reduced-motion 下的行为与修复前一致。
