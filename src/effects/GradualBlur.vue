<script setup lang="ts">
/**
 * 渐进模糊条带 —— divCount 层绝对定位 div 逐层 backdrop-filter: blur()，
 * 用 linear-gradient mask 让模糊强度沿一条边从 0 渐增到峰值：
 * 内容从页头下方穿行时被渐进模糊，条带本身不挡点击。
 * 移植自 vue-bits GradualBlur（MIT），本地副本 research/vue-bits/GradualBlur.vue:194-272，
 * props 按 docs/CONTRACTS.md §3.5 收敛为 11 项（animated、duration、easing、curve、
 * responsive 及 mobile/tablet/desktop 六项尺寸、preset、gpuOptimized、hoverIntensity、
 * onAnimationComplete 被裁剪，实现不依赖：层间分布恒为线性曲线，无悬浮增强，无滚动显隐）。
 *
 * 降级策略：
 *  - 本组件天然静止：无 rAF、无任何监听（上游的 resize/IntersectionObserver 挂载点
 *    都在被裁剪的 responsive/animated 分支里），prefers-reduced-motion 下无需改动
 *    ——它就是契约 §3.8 说的「静态遮罩」形态；
 *  - hoverIntensity 被裁剪 → pointer-events 恒为 none（§3.8：不拦截鼠标事件）；
 *  - 不支持 backdrop-filter 的内核丢弃模糊声明，各层退化为透明 div，视觉无残留；
 *  - Safari <18 对 backdrop-filter 不自动补前缀，层样式显式写 -webkit- 副本
 *    （research 笔记 GradualBlur 移植要点 ②）；
 *  - 上游运行时注入的全局 <style id="gradual-blur-styles"> 由 scoped CSS 取代，零注入。
 */
import { computed, type CSSProperties } from 'vue';

export type GradualBlurProps = {
  position?: 'top' | 'bottom' | 'left' | 'right';
  strength?: number;
  height?: string;
  width?: string;
  divCount?: number;
  exponential?: boolean;
  zIndex?: number;
  opacity?: number;
  target?: 'parent' | 'page';
  className?: string;
  style?: CSSProperties;
};

const props = withDefaults(defineProps<GradualBlurProps>(), {
  position: 'bottom',
  strength: 2,
  height: '6rem',
  divCount: 5,
  exponential: false,
  zIndex: 1000,
  opacity: 1,
  target: 'parent',
  className: '',
  style: () => ({})
});

/** position 同时决定贴边方向与 mask 渐变方向（上游 :134-142） */
const GRADIENT_DIRECTIONS: Record<GradualBlurProps['position'] & string, string> = {
  top: 'to top',
  bottom: 'to bottom',
  left: 'to left',
  right: 'to right'
};

const blurDivs = computed(() => {
  const divs: Array<{ style: CSSProperties }> = [];
  const count = Math.max(1, Math.floor(props.divCount));
  const increment = 100 / count;

  for (let i = 1; i <= count; i++) {
    // 线性层间分布（curve 被裁剪，恒等价于上游 CURVE_FUNCTIONS.linear）。
    // 指数曲线分支保留：Math.pow(2, progress * 4) * 0.0625（上游 :209-213）。
    const progress = i / count;
    const blurValue = props.exponential
      ? Math.pow(2, progress * 4) * 0.0625 * props.strength
      : 0.0625 * (progress * count + 1) * props.strength;

    const p1 = Math.round((increment * i - increment) * 10) / 10;
    const p2 = Math.round(increment * i * 10) / 10;
    const p3 = Math.round((increment * i + increment) * 10) / 10;
    const p4 = Math.round((increment * i + increment * 2) * 10) / 10;

    let gradient = `transparent ${p1}%, black ${p2}%`;
    if (p3 <= 100) gradient += `, black ${p3}%`;
    if (p4 <= 100) gradient += `, transparent ${p4}%`;

    const direction = GRADIENT_DIRECTIONS[props.position] ?? 'to bottom';
    const maskImage = `linear-gradient(${direction}, ${gradient})`;

    divs.push({
      style: {
        maskImage,
        WebkitMaskImage: maskImage,
        backdropFilter: `blur(${blurValue.toFixed(3)}rem)`,
        WebkitBackdropFilter: `blur(${blurValue.toFixed(3)}rem)`,
        opacity: props.opacity
      }
    });
  }

  return divs;
});

const containerStyle = computed((): CSSProperties => {
  const isVertical = props.position === 'top' || props.position === 'bottom';
  const isPageTarget = props.target === 'page';

  const base: CSSProperties = {
    position: isPageTarget ? 'fixed' : 'absolute',
    pointerEvents: 'none',
    // target='page' 时 zIndex +100 沿上游（research 笔记：需压在页头 z 下要显式传 :z-index）
    zIndex: isPageTarget ? props.zIndex + 100 : props.zIndex,
    ...props.style
  };

  if (isVertical) {
    base.height = props.height;
    base.width = props.width || '100%';
    base[props.position] = '0';
    base.left = '0';
    base.right = '0';
  } else {
    // 水平方向的条带纵深由 height 承担（上游 :264：width = width || height）
    base.width = props.width || props.height;
    base.height = '100%';
    base[props.position] = '0';
    base.top = '0';
    base.bottom = '0';
  }

  return base;
});
</script>

<template>
  <div
    class="gradual-blur"
    :class="props.target === 'page' ? 'gradual-blur--page' : 'gradual-blur--parent'"
    :style="containerStyle"
  >
    <div class="gradual-blur__inner">
      <div v-for="(div, index) in blurDivs" :key="index" class="gradual-blur__layer" :style="div.style" />
    </div>
    <div v-if="$slots.default" class="gradual-blur__content">
      <slot />
    </div>
  </div>
</template>

<!-- 上游 Tailwind：relative isolate / relative w-full h-full / absolute inset-0，
     以及运行时注入的 .gradual-blur{pointer-events:none} —— 全部改写为 scoped CSS。 -->
<style scoped>
.gradual-blur {
  /* position / 几何 / zIndex 全部由内联样式（containerStyle）给出；定位形态是
     absolute（target='parent'）或 fixed（target='page'），页头把本组件放进
     sticky/fixed 容器即成「悬浮页头」用法 */
  isolation: isolate;
  pointer-events: none;
}

.gradual-blur__inner {
  position: relative;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.gradual-blur__layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.gradual-blur__content {
  position: relative;
}
</style>
