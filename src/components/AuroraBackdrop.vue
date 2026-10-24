<script setup lang="ts">
/*
 * AuroraBackdrop —— 极光光带背景（方向契约的背景世界）。
 * 参考站 kexie.space 的斜向长曝光带：几条大尺度、重度模糊的渐变光束从左下扫向
 * 右上，缓慢漂移；暗角把光压向画面下半与边缘，中上部留给标题、正文区保持可读。
 * 纯 CSS（transform/opacity 动画 + 静态 filter: blur），零 JS、零监听；
 * prefers-reduced-motion 下保留构图、关闭动画。
 * 性能：动画只动 transform（合成器路径），blur 是一次性栅格成本；层内 contain 隔离。
 * V2：光束 opacity 走 --aurora-o-a/b/c/d、暗角走 --vignette-a/b（DESIGN-V2 §3.5）——
 * 两主题共用同一构造，暗色=长曝浓光，亮色=薄雾（blur 88px，见样式末尾）。
 */
</script>

<template>
  <div class="aurora" aria-hidden="true">
    <div class="beam beam-a"></div>
    <div class="beam beam-b"></div>
    <div class="beam beam-c"></div>
    <div class="beam beam-d"></div>
    <div class="vignette"></div>
  </div>
</template>

<style scoped>
.aurora {
  position: absolute;
  inset: 0;
  overflow: hidden;
  contain: strict;
}

/* 光束：细长渐变带旋转后横越画面，重度模糊把它化成「光」。
   宽度给足余量（150vmax），端点永远在画面外；漂移只动 transform。 */
.beam {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 150vmax;
  height: 18vmax;
  margin: -9vmax 0 0 -75vmax;
  border-radius: 50%;
  filter: blur(72px);
  opacity: var(--aurora-o-a);
  will-change: transform;
}

.beam-a {
  background: linear-gradient(
    90deg,
    transparent,
    var(--aurora-blue) 30%,
    var(--aurora-cyan) 55%,
    transparent 85%
  );
  transform: rotate(-24deg) translate3d(-12vmax, 16vmax, 0);
  animation: drift-a 46s ease-in-out infinite alternate;
}

.beam-b {
  background: linear-gradient(
    90deg,
    transparent,
    var(--aurora-green) 35%,
    var(--aurora-cyan) 60%,
    transparent 88%
  );
  transform: rotate(-18deg) translate3d(18vmax, 30vmax, 0);
  opacity: var(--aurora-o-b);
  animation: drift-b 58s ease-in-out infinite alternate;
}

.beam-c {
  background: linear-gradient(
    90deg,
    transparent,
    var(--aurora-violet) 40%,
    var(--aurora-blue) 65%,
    transparent 90%
  );
  transform: rotate(-30deg) translate3d(-20vmax, -6vmax, 0);
  opacity: var(--aurora-o-c);
  animation: drift-c 64s ease-in-out infinite alternate;
}

.beam-d {
  background: linear-gradient(90deg, transparent, var(--aurora-blue) 45%, transparent 80%);
  transform: rotate(-12deg) translate3d(6vmax, 44vmax, 0);
  opacity: var(--aurora-o-d);
  animation: drift-d 52s ease-in-out infinite alternate;
}

@keyframes drift-a {
  to {
    transform: rotate(-20deg) translate3d(14vmax, 8vmax, 0);
  }
}

@keyframes drift-b {
  to {
    transform: rotate(-22deg) translate3d(-10vmax, 22vmax, 0);
  }
}

@keyframes drift-c {
  to {
    transform: rotate(-26deg) translate3d(10vmax, -14vmax, 0);
  }
}

@keyframes drift-d {
  to {
    transform: rotate(-16deg) translate3d(-8vmax, 36vmax, 0);
  }
}

/* 暗角：光带压向边缘，标题与正文底下保持深沉（两主题取值见 --vignette-a/b） */
.vignette {
  position: absolute;
  inset: 0;
  background: var(--vignette-a), var(--vignette-b);
}

@media (prefers-reduced-motion: reduce) {
  .beam {
    animation: none;
  }
}

/* 亮色：光束化成薄雾，blur 加深一档把色度进一步化开（DESIGN-V2 §3.5）。
   blur 是一次性栅格成本、静态滤镜，与动效偏好无关，直接按主题切换。 */
html[data-theme='light'] .beam {
  filter: blur(88px);
}
</style>
