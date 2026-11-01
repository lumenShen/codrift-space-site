# 004 — SwapText 换场改用 transition，打断时从当前透明度/模糊续走

- **Status**: TODO
- **Commit**: 631cb0a
- **Severity**: MEDIUM
- **Category**: 4. Interruptibility
- **Estimated scope**: 1 个文件（`src/components/hero/SwapText.vue`），≈ +80 / −45 行；改动集中在 `<script setup>` 的换场管线与 `<style scoped>` 的换场样式，模板与 props 不变

## Problem

`src/components/hero/SwapText.vue` 是首页第二行大字的换场管线：旧文案 0–0.3s 淡出并加模糊，新文案 0.2s 起 0.3s 淡入，0.5s 内完成。实现方式是 **keyframes**，而每次换场都会给旧层重新生成 key：

```ts
/* src/components/hero/SwapText.vue:92-97 — current */
    layers.value = [
      ...layers.value
        .filter((l) => l.phase !== 'out')
        .map((l) => ({ ...l, phase: 'out' as const, key: nextKey('out') })),
      { key: nextKey('in'), item, phase: 'in' as const },
    ];
```

```ts
/* src/components/hero/SwapText.vue:61 — current */
const nextKey = (tag: string): string => `${tag}#${epoch++}`;
```

`epoch` 单调递增，所以 `.map(... key: nextKey('out'))` 每次都会产生一个从未出现过的 key —— Vue 会把该层整块卸载后重挂，而不是复用 DOM。重挂后元素拿到 `swap-layer--out` 类，`animation` 从 0% 重新起播：

```css
/* src/components/hero/SwapText.vue:148-156 — current */
/* old：0s 起 0.3s 渐出 + 模糊增大 */
.swap-layer--out {
  animation: swap-out 0.3s var(--ease-out-quart) both;
}

/* new：0.2s 起 0.3s 渐入 + 模糊减小（delay 0.2s 写死，全程 0.5s 内完成） */
.swap-layer--in {
  animation: swap-in 0.3s var(--ease-out-quart) 0.2s both;
}
```

```css
/* src/components/hero/SwapText.vue:178-200 — current */
@keyframes swap-out {
  from {
    opacity: 1;
    filter: blur(0);
  }

  to {
    opacity: 0;
    filter: blur(var(--swap-blur, 6px));
  }
}

@keyframes swap-in {
  from {
    opacity: 0;
    filter: blur(var(--swap-blur, 6px));
  }

  to {
    opacity: 1;
    filter: blur(0);
  }
}
```

**后果（打断时可见跳变）**：上一任「新层」在被顶掉时，如果正处于 `swap-in` 的 0.2s 延迟窗口内（`fill: both`，计算值恒为 `opacity: 0` / `blur(6px)`），重挂成 out 层后 `swap-out` 从 `from { opacity: 1; filter: blur(0) }` 起播，半透明的旧文案会先整块跳回全不透明再淡出 —— 即 0→1 的闪。若打断发生在 200–500ms 的淡入途中，则是从当前半透明跳到 1 再淡出。这不是理论窗口：FeatureTag 的提交间隔由 `pendingTimer` 门控，最短等于下压首峰时间 ≈179ms（`src/components/hero/stackMotion.ts:15-21` 的 `SPRING_SNAPPY` 注释：≈179ms 到峰；`src/components/hero/FeatureTag.vue:514-528`），**短于 SwapText 的 200ms 延迟**，所以双击顶卡、连按 Enter、按住方向键连发、以及 5s 自动轮播（`FeatureTag.vue:93`）都能稳定落在延迟窗口里触发第二次提交。

同一场景还有第二次跳变：换场时上一拍的 out 层会被 `.filter((l) => l.phase !== 'out')` 直接移出数组（`SwapText.vue:93`），若它还在 0–300ms 的淡出途中（例如第二次换场发生在第一次之后的 100ms，旧层还有约 0.5–0.7 的不透明度），会以当前半透明状态被瞬间从 DOM 拔掉，「啪」地消失。当前实现只有一个 `outTimer`（`SwapText.vue:90,100-105`），每次换场 `clearTimeout` 后重排，无法为多个退场层分别计时。

代码 91 行注释只承诺「保证同屏最多一组新旧」，`docs/DESIGN-V2.md` 与 `docs/CONTRACTS.md` 均未对「换场进行中被打断」作规定，因此不属于有意取舍。这条属于审计规则 4：**keyframes 从零重播，快速可重触发/可逆的 UI 必须用 transition 或弹簧**。

## Target

把换场动画整体从 `@keyframes` 改为 `opacity` / `filter` 的 **transition**，保留层 key 不再重生成（同一 DOM 元素上只换 class，transition 从当前 opacity/blur 重定向到新目标）；新层挂载后先进入不可见的 `pending` 静置 200ms 再由 JS 翻到 `in`，等价于规格里的 0.2s 延迟（不依赖 `@starting-style`）。退场层各自在 300ms 后卸载，不再被下一拍直接拔出 DOM。

时间轴与曲线保持站点已定稿的换场规格，**不新增曲线、不新增令牌**：

- 旧层：0s 起 0.3s，`opacity 1→0`、`filter blur(0)→blur(var(--swap-blur, 6px))`，曲线 `var(--ease-out-quart)` = `cubic-bezier(0.22, 1, 0.36, 1)`（`src/styles/tokens.css:166`）。
- 新层：0.2s（JS `IN_DELAY_MS = 200`）起 0.3s，`opacity 0→1`、`filter blur(6px)→blur(0)`，同一曲线；全程 500ms。
- 0.3s / 0.2s 是 SwapText 头注释里写死的既有规格值（`SwapText.vue:3-6`），不是新造时长；总时长 300ms ≤ 360ms，曲线走令牌（`docs/DESIGN-V2.md:687-691`）。
- `prefers-reduced-motion: reduce`：所有层 `transition: none`，新层直接以 `in` 挂载、退场层 0ms 卸载并 `display: none`（沿用现有矩阵，`docs/DESIGN-V2.md:693-706`）。
- 模糊峰值 6px（`blur` prop 可调，默认 6），远低于审计的性能上限 20px。

最终 `<script setup>` 中「量宽 + 换场」段落（从时间轴常量到 `onBeforeUnmount`）为：

```ts
/* 规格时间轴（ms）：old 0→300 渐出；new 200→500 渐入；全程 500 内完成。
   退场/进场走 opacity、filter 的 transition（不是 keyframes）：换场中途再换一次时，
   同一元素从当前 opacity/blur 续走到新目标，不会从 0% 重播（审计规则 4）。
   新层挂载后先进入 pending（不可见）静置 IN_DELAY_MS，再由 JS 翻到 in，
   等价于规格里的 0.2s 延迟；不用 @starting-style（Vite 默认构建目标不保证支持）。 */
const OUT_MS = 300;
const IN_DELAY_MS = 200;

let measured = false;
let epoch = 0;
const inTimers = new Map<string, ReturnType<typeof setTimeout>>();
const outTimers = new Map<string, ReturnType<typeof setTimeout>>();

const nextKey = (tag: string): string => `${tag}#${epoch++}`;

function clearTimer(map: Map<string, ReturnType<typeof setTimeout>>, key: string): void {
  const timer = map.get(key);
  if (timer === undefined) return;
  clearTimeout(timer);
  map.delete(key);
}

function setPhase(key: string, phase: Layer['phase']): void {
  layers.value = layers.value.map((l) => (l.key === key ? { ...l, phase } : l));
}

/* 旧层在 OUT_MS 后各自卸载：快速连按时不把上一拍未走完的旧层直接拔出 DOM
   （直接移除会让它在当前半透明度上「啪」地消失，是打断时的第二次跳变）。 */
function scheduleOutRemoval(key: string): void {
  clearTimer(outTimers, key);
  outTimers.set(
    key,
    setTimeout(() => {
      outTimers.delete(key);
      layers.value = layers.value.filter((l) => l.key !== key);
    }, reducedMotion.value ? 0 : OUT_MS),
  );
}

function measure(): void {
  const el = sizerRef.value;
  if (!el) return;
  el.classList.add('swap-sizer--measuring');
  const natural = Math.ceil(el.getBoundingClientRect().width);
  el.classList.remove('swap-sizer--measuring');
  const target = Math.max(0, Math.min(natural, props.maxWidth ?? 640));
  if (!target) return;
  if (measured) widthSpring.setTarget(target);
  else {
    widthSpring.set(target); // 首次量宽直接落位（首帧绘制前完成，无动画无闪烁）
    measured = true;
  }
}

watch(
  () => props.swapKey,
  (key) => {
    const item = props.resolve(key);
    if (item == null) return;
    if (!measured && layers.value.length === 0) {
      // 首帧：内容直接显形（hold 层无动画），宽度按新内容量测落位
      layers.value = [{ key: nextKey('hold'), item, phase: 'hold' }];
      sizerItem.value = item;
      void nextTick(measure);
      return;
    }

    const reduced = reducedMotion.value;
    const next: Layer[] = [];

    for (const layer of layers.value) {
      if (layer.phase === 'out') {
        next.push(layer); // 已在退场：保持原 key 与各自的卸载计时
        continue;
      }
      if (layer.phase === 'pending') {
        // 还没显形（opacity 0）就被下一拍顶掉：撤掉提升计时并直接移除，无可见跳变
        clearTimer(inTimers, layer.key);
        continue;
      }
      // hold / in：原地转 out，key 不变 → Vue 复用同一 DOM，transition 从当前值续走
      next.push({ ...layer, phase: 'out' });
      scheduleOutRemoval(layer.key);
    }

    const inKey = nextKey('in');
    next.push({ key: inKey, item, phase: reduced ? 'in' : 'pending' });
    layers.value = next;
    sizerItem.value = item; // 宽度/高度按「新内容」量测
    void nextTick(measure);

    if (!reduced) {
      inTimers.set(
        inKey,
        setTimeout(() => {
          inTimers.delete(inKey);
          setPhase(inKey, 'in');
        }, IN_DELAY_MS),
      );
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  for (const timer of inTimers.values()) clearTimeout(timer);
  for (const timer of outTimers.values()) clearTimeout(timer);
  inTimers.clear();
  outTimers.clear();
});
```

`Layer` 的 phase 增加一个 `pending`：

```ts
/* src/components/hero/SwapText.vue — target */
interface Layer {
  key: string;
  item: T;
  phase: 'hold' | 'pending' | 'in' | 'out';
}
```

`<style scoped>` 中换场相关段落（`.swap-layer` 到 reduced-motion 块）为：

```css
/* 新旧内容同格绝对定位（规格原文：「新旧内容同格绝对定位、宽度按新内容量测过渡」） */
.swap-layer {
  position: absolute;
  inset: 0;
  /* 只过渡 opacity / filter：被打断时 transition 从当前值重定向到新目标；
     keyframes 会从 0% 重播，这是本次修复的根因（审计规则 4）。
     时长沿用换场规格 0.3s，曲线用站点令牌 --ease-out-quart。 */
  opacity: 0;
  filter: blur(var(--swap-blur, 6px));
  transition:
    opacity 0.3s var(--ease-out-quart),
    filter 0.3s var(--ease-out-quart);
}

/* 首帧内容：直接显形，不播换场动画 */
.swap-layer--hold {
  opacity: 1;
  filter: blur(0);
  transition: none;
}

/* 新层的静置帧：不可见，等 JS 在 200ms 后翻到 --in；挂载瞬间不会冒出一帧全不透明 */
.swap-layer--pending {
  opacity: 0;
  filter: blur(var(--swap-blur, 6px));
  transition: none;
}

/* old：0s 起 0.3s 渐出 + 模糊增大 */
.swap-layer--out {
  opacity: 0;
  filter: blur(var(--swap-blur, 6px));
}

/* new：0.2s 起 0.3s 渐入 + 模糊减小（0.2s 延迟由 JS 的 pending→in 承担） */
.swap-layer--in {
  opacity: 1;
  filter: blur(0);
}

/* 隐藏 sizer：撑起容器高度 + 量宽基准（aria-hidden + visibility 双保险）。
   span 根需要显式块级化（组件根/层用 span 是为了合法进入 button/p 容器）。 */
.swap-sizer {
  display: block;
  visibility: hidden;
}

/* 量宽瞬间：转 absolute / max-content，读数后立刻还原（同一同步块，无中间绘制） */
.swap-sizer--measuring {
  position: absolute;
  width: max-content;
  max-width: v-bind(capCss);
}

@media (prefers-reduced-motion: reduce) {
  .swap-layer {
    transition: none;
  }

  /* 旧层立即消失（JS 侧 0ms 卸载，双保险） */
  .swap-layer--out {
    display: none;
  }
}
```

`@keyframes swap-out` / `@keyframes swap-in` 两个块整体删除（不再被任何选择器引用）。

## Repo conventions to follow

- 动效曲线与时长必须用 `src/styles/tokens.css:165-171` 的令牌：`--ease-out-quart: cubic-bezier(0.22, 1, 0.36, 1)`、`--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)`、`--dur-fast: 160ms` / `--dur-base: 240ms` / `--dur-slow: 360ms`。语义分工见 `docs/DESIGN-V2.md:687-689`：rail 收展/内容偏移/通用进出用 `--ease-out-quart`。
- 本仓用「同一元素上切状态类、由 transition 从当前值重定向」实现可打断显隐，示范是 `src/components/RouterRail.vue:381-397`：

  ```css
  /* src/components/RouterRail.vue:381-397 — 已有正确示范 */
  .rail-scrim {
    opacity: 0;
    visibility: hidden;
    transition:
      opacity var(--dur-base) ease-out,
      visibility 0s var(--dur-base);
  }

  .rail-scrim.is-open {
    opacity: 1;
    visibility: visible;
    transition: opacity var(--dur-base) ease-out;
  }
  ```

  照这个模式写：base 类给出起点 + transition，状态类只改目标值，不在状态类里写 `animation`。
- 组件头注释用中文写明时间轴与 reduced-motion 退化方式，风格照 `SwapText.vue:3-12`。本次修改后必须同步该注释（它目前写的是「动画」和 300ms 后卸载）。
- reduced-motion 的写法照本组件现有的 `@media (prefers-reduced-motion: reduce)`（`SwapText.vue:202-212`）与 `src/styles/base.css:155-159`：关闭运动、保留/瞬时完成状态变化，不把反馈一并删掉。

## Steps

1. **扩展 `Layer.phase`**（`src/components/hero/SwapText.vue:33-37`）：把 `'hold' | 'in' | 'out'` 改为 `'hold' | 'pending' | 'in' | 'out'`，其余字段不动。

2. **替换时间轴常量与计时器声明**（`SwapText.vue:54-61`）。把 `const OUT_MS = 300;` 那段与 `let outTimer` 删除，换成 Target 中的 `OUT_MS` / `IN_DELAY_MS` / `inTimers` / `outTimers` / `nextKey`。删掉原来的 `let outTimer: ReturnType<typeof setTimeout> | undefined;`（第 59 行）。`nextKey` 函数体保持 `${tag}#${epoch++}` 不变。

3. **新增三个辅助函数**（紧接 `nextKey` 之后、`measure` 之前）：`clearTimer`、`setPhase`、`scheduleOutRemoval`，代码逐字照 Target。`setPhase` 用不可变替换（`map` + 展开），保证 `shallowRef` 触发渲染；`scheduleOutRemoval` 里读 `reducedMotion.value` 决定 0ms 还是 `OUT_MS`。

4. **重写 watch 回调的换场分支**（`SwapText.vue:90-105`）。删除 `clearTimeout(outTimer);`、整段数组重建（含 `.filter((l) => l.phase !== 'out')` 与 `.map(... key: nextKey('out'))`）和末尾的 `outTimer = setTimeout(...)`，替换为 Target 中 `const reduced = ...` 到 `if (!reduced) { ... }` 的整段。首帧 hold 分支（83-88 行）与 `{ immediate: true }` 保持不变。行为变化：
   - 保留层（`hold` / `in`）只把 `phase` 改成 `'out'`，key 原样保留；
   - 已在 `out` 的层继续留在数组里，等自己的 300ms 计时结束；
   - `pending` 层被顶掉时撤计时并直接移除（它 opacity 为 0，移除不可见）；
   - 新层 key 仍由 `nextKey('in')` 生成（每次出现唯一，不与仍在退场的同内容层冲突）。

5. **替换 `onBeforeUnmount`**（`SwapText.vue:110-112`）：把 `clearTimeout(outTimer);` 换成 Target 中遍历 `inTimers` / `outTimers` 的清空逻辑，防止卸载后定时器回调去改已销毁组件的 `layers`。

6. **同步头注释**（`SwapText.vue:3-12`）：把「动画结束（300ms）即卸载」「两层动画退化为瞬时切换」等表述改为 transition 语义，并补一句打断行为。建议文案：

   ```ts
   /**
    * SwapText —— 文字换场管线（站长逐条规格，时间轴全部写死在此）：
    *   - old 内容：0s 起 0.3s 渐出（opacity 1→0）+ 模糊增大（blur 0→--swap-blur），
    *     300ms 后卸载（每层独立计时，快速连按不会把未走完的旧层直接拔出 DOM）；
    *   - new 内容：挂载后先 pending（不可见）静置 0.2s，再 0.3s 渐入（opacity 0→1）+
    *     模糊减小；新旧切换全程 0.5s 内完成；
    *   - 两者都用 opacity/filter 的 transition（不是 keyframes）：换场中途再换一次时
    *     从当前 opacity/blur 续走，不会跳回全不透明；
    *   - 容器宽度用 spring（微超伸预设）按「新内容」量测顺滑过渡（下略，原文保留）；
    *   - prefers-reduced-motion：两层退化为瞬时切换（CSS 关 transition + 旧层 0ms 卸载），
    *     宽度 spring 由 SpringValue 自动退化为跳变。
    ...
   ```

   注释里「容器宽度」「用法」「根元素用 span」三段原文保留，只改上面三条。

7. **替换样式类**（`SwapText.vue:142-162`）：把 `.swap-layer`、`.swap-layer--out`、`.swap-layer--in`、`.swap-layer--hold` 四段删掉，写入 Target 中的 `.swap-layer` / `--hold` / `--pending` / `--out` / `--in` 五段。保留 `.swap-layer` 的 `position: absolute; inset: 0;`。注意：`hold` 的 `filter` 从 `none` 改为 `blur(0)`，让 hold→out 的 filter 两端函数表一致（`none` 在部分引擎里不做插值，会跳变）。
8. **删除 `@keyframes swap-out` 与 `@keyframes swap-in`**（`SwapText.vue:178-200`）整两块。
9. **替换 reduced-motion 块**（`SwapText.vue:202-212`）：选择器从 `.swap-layer--in, .swap-layer--out { animation: none }` 改为 `.swap-layer { transition: none }`，保留 `.swap-layer--out { display: none; }` 与注释。代码逐字照 Target。
10. **更新 91 行注释**：`// 上一任现役层转入渐出（未完成的让位，保证同屏最多一组新旧）` 改为 `// 上一任现役层原地转入渐出（key 不变，DOM 复用，transition 从当前值续走）；各自 300ms 后卸载`。

## Boundaries

- **只改 `src/components/hero/SwapText.vue`。** 不改 `HomePage.vue` 的调用、不改 `FeatureTag.vue` 的换牌节奏、不改 `useSpring.ts` 的弹簧参数、不改 `tokens.css` 的令牌。
- 模板结构不动：`v-for`、`:key="layer.key"`、`:class`、`aria-hidden`、sizer 三行保持原样；不新增 DOM 节点，不改 props / slot / 导出。
- 不加任何依赖（运行时依赖锁死为 `vue` / `vue-router` / `three` / `marked`，`docs/CONTRACTS.md:20,282`）。不引入 `@starting-style`、Web Animations API 或第三方动画库。
- 不把 0.3s 改成 `--dur-base` / `--dur-slow`：0.3s 与 0.2s 是 SwapText 头注释里写死的换场规格（0–0.3s / 0.2–0.5s），改令牌值会破坏这条时间轴与 FeatureTag 的同步节奏。
- 不动容器宽度弹簧：`widthSpring`、`0.25` 精度、`SPRING_MICRO_OVERSHOOT` 全部保持（`SwapText.vue:48-52`）。
- 如果打开文件发现 92-97 / 148-156 / 178-200 / 202-212 行内容与本文引用不一致（提交戳之后有人改过），**停下并报告漂移**，不要按行号硬套，也不要顺手重构。

## Verification

- **Mechanical**：
  - `npm run build` —— 期望通过（`vue-tsc --noEmit && vite build` 均无报错，无未使用变量告警导致的失败）。
  - `grep -n "swap-out\|swap-in" src/components/hero/SwapText.vue` —— 期望 0 命中（keyframes 已删净）。
  - `grep -n "animation:" src/components/hero/SwapText.vue` —— 期望 0 命中（换场不再用 animation）。
  - `grep -n "nextKey('out')" src/components/hero/SwapText.vue` —— 期望 0 命中（保留层不再重生成 key）。
- **Feel check**（`npm run dev`，首页 hero 区；触发方式是点击最上面那张身份卡 / 聚焦后按 Enter、方向键，或等 5s 自动轮播）：
  - 打开 DevTools **Animations** 面板，把播放速度调到 **10%**，触发一次换场。确认：旧行从第一帧就开始降透明度并逐渐变糊（0→6px），新行在前 200ms 保持完全透明，随后用 300ms 淡入、模糊从 6px 收到 0；没有一条轨道在中断后从 `opacity: 1` 重新起播。
  - **打断测试**：以尽可能快的节奏连按 Enter / 方向键（或用方向键按住连发）制造第二次换场。在 10% 慢放下确认：正在淡入的那一行**不会闪成全不透明**——若它已过 200ms，就从当前半透明直接反向淡出；若仍在 200ms 静置窗口内，它根本不显形。同时确认上一拍正在淡出的旧行是平滑走完 0.3s 后消失，而不是在某个中间透明度上突然消失。
  - 在 **Elements** 面板选中一个 `.swap-layer--in` 节点，然后触发换场：确认该节点仍处于选中状态、class 变成 `swap-layer--out`（DOM 被复用），而不是被替换成新节点。
  - **Rendering** 面板 → Emulate CSS media feature `prefers-reduced-motion: reduce`：再触发换场，确认文字瞬时切换，没有 0.3s 淡入淡出、没有模糊爬升，也没有残留的不可见旧层（out 层 `display: none` 且 0ms 卸载）；容器宽度直接落到新文案宽度。
  - 恢复 no-preference 后确认容器宽度仍按 `SPRING_MICRO_OVERSHOOT`（k=320 / c=24 / m=1，ζ≈0.671、≈5.8% 过冲）微超伸过渡，换场时没有横向抖动。
- **Done when**：`npm run build` 通过；上述三条 grep 均 0 命中；10% 慢放下的打断测试里，旧文案从未跳回全不透明、退场层从未在中间透明度上单帧消失；reduced-motion 下换场为瞬时且无残留层。
