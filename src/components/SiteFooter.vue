<script setup lang="ts">
/*
 * SiteFooter —— 全站页脚（挂 App.vue，router-view 之后）。
 * V2（DESIGN-V2 §4.3）：去「居中两行小字」，改三列网格——
 *   列 1 品牌（drift mark 20px + Codrift + 定稿文案「一个人的代码漂流站」）；
 *   列 2 站内（首页/博客，RouterLink 走 hash 路由）；列 3 联系（GitHub/邮箱/域名）。
 * 两个链接列纵向堆叠、无列头（评审 #11：链接归属靠列位置自明）；
 * 无玻璃盒、无大圆角。meta 行「© 2026 lumenShen · codrift.space」上缘 1px --line，
 * 不放桂电提及（身份提及只在关于板块，PRODUCT.md:11）。
 * 事实文案（lumenShen / gozaoo@outlook.com / codrift.space / GitHub 地址）一律原样。
 * 顶部极光发丝线保留（::before，主色向两侧渐隐，1px）。
 * 左内边距随 dock rail 联动：--rail-offset 由 .app-shell 驱动（DESIGN-V2 §2.2），
 * 未落地/收起/窄屏时回退 0px，与本组件旧版 24px 内边距一致。
 */
</script>

<template>
  <footer class="site-footer">
    <div class="foot-inner">
      <div class="foot-grid">
        <div class="foot-brand">
          <p class="foot-name">
            <svg class="foot-mark" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path
                d="M3 15c4-7 9-9 13-7"
                fill="none"
                stroke="var(--accent)"
                stroke-width="2.2"
                stroke-linecap="round"
              />
              <path
                d="M6 19c5-8 10-10 15-8"
                fill="none"
                stroke="var(--accent-2)"
                stroke-width="2.2"
                stroke-linecap="round"
                opacity="0.75"
              />
            </svg>
            Codrift
          </p>
          <p class="foot-tagline">一个人的代码漂流站</p>
        </div>

        <nav class="foot-col" aria-label="页脚站内导航">
          <RouterLink class="foot-link" to="/" data-cursor="target">首页</RouterLink>
          <RouterLink class="foot-link" to="/blog" data-cursor="target">博客</RouterLink>
        </nav>

        <div class="foot-col">
          <a
            class="foot-link"
            href="https://github.com/lumenShen/"
            target="_blank"
            rel="noopener noreferrer"
            data-cursor="target"
          >
            GitHub
          </a>
          <a class="foot-link" href="mailto:gozaoo@outlook.com" data-cursor="target">
            gozaoo@outlook.com
          </a>
          <a class="foot-link" href="https://codrift.space" data-cursor="target">codrift.space</a>
        </div>
      </div>

      <p class="foot-meta">© 2026 lumenShen · codrift.space</p>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  position: relative;
  z-index: var(--z-content);
  /* 底部大留白避开 FAB（原 calc(--space-8 * 2) = 128px 保留） */
  padding: var(--space-7) var(--space-5) calc(var(--space-8) * 2);
  /* dock rail 展开时与 .app-main 同式左让位（§2.2 同一变量的消费方） */
  padding-left: calc(var(--rail-offset, 0px) + var(--space-5));
}

/* 收束整页的发丝线：主色向两侧渐隐（1px，不是彩色粗边） */
.site-footer::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  width: min(680px, 80%);
  height: 1px;
  transform: translateX(-50%);
  background: linear-gradient(90deg, transparent, var(--accent-line), transparent);
}

/* 三列网格页脚：max 1080 内容列内布局（无玻璃盒、无大圆角、无列头） */
.foot-inner {
  max-width: 1080px;
  margin-inline: auto;
}

.foot-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr;
  gap: var(--space-7);
}

/* ---- 品牌列 ---- */
.foot-name {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  font-family: var(--font-display);
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--fg-0);
}

.foot-mark {
  flex: none;
}

.foot-tagline {
  margin: var(--space-2) 0 0;
  color: var(--fg-2);
  font-size: 0.85rem;
}

/* ---- 链接列：纵向堆叠、无列头 ---- */
.foot-col {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-2);
}

.foot-link {
  color: var(--fg-1);
  font-size: 0.875rem;
  text-decoration: none;
  transition: color var(--dur-fast, 0.16s) ease-out;
}

.foot-link:hover {
  color: var(--accent-strong);
}

/* ---- meta 行 ---- */
.foot-meta {
  margin: var(--space-5) 0 0;
  padding-top: var(--space-4);
  border-top: 1px solid var(--line);
  color: var(--fg-2);
  font-size: 0.75rem;
}

@media (max-width: 767px) {
  .foot-grid {
    grid-template-columns: 1fr;
    gap: var(--space-5);
  }
}

@media (prefers-reduced-motion: reduce) {
  .foot-link {
    transition: none;
  }
}
</style>
