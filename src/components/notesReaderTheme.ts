/*
 * 注入到笔记 iframe 内的版式。
 *
 * 站点有亮/暗两套主题：亮色下保留笔记原本的纸面版式（白纸 + 浅色语义块），
 * 只做阅读器化的结构处理；暗色下才把纸面换成深色面板。这样两套主题下
 * 正文的版心、字号、代码块尺寸都与原书一致，不会因为阅读器而变形。
 */

export type ReaderTheme = 'dark' | 'light';

const baseCss = String.raw`
html.cr-embed {
  scroll-padding-top: 18px;
}

html.cr-embed .sitenav,
html.cr-embed .skip-link,
html.cr-embed .viz-hooks {
  display: none !important;
}

/* 阅读器顶栏已经占掉页面顶部，正文留一点呼吸空间；侧边距仍用原书版式 */
html.cr-embed .doc {
  padding-top: 2rem !important;
}

/* 纸面版的「末行追出」组写死了 nowrap，阅读面板变窄时会撑破版面 */
html.cr-embed .nb-tail {
  white-space: normal !important;
}

/* 亮色主题：让 iframe 也按亮色渲染（即使系统偏好深色） */
html.cr-embed[data-reader-theme='light'] {
  color-scheme: light !important;
}

@media screen and (prefers-color-scheme: dark) {
  html.cr-embed[data-reader-theme='light'] {
    --ink: #16181d !important;
    --ink-soft: #333a46 !important;
    --ink-mute: #6b7280 !important;
    --rule: #d8dce3 !important;
    --rule-soft: #e8ebf0 !important;
    --rule-strong: #aeb6c2 !important;
    --paper: #ffffff !important;
    --paper-soft: #f6f8fa !important;
    --paper-tint: #f2f5f9 !important;
  }

  html.cr-embed[data-reader-theme='light'] body {
    background: #ffffff !important;
    color: var(--ink) !important;
  }

  html.cr-embed[data-reader-theme='light'] strong {
    color: var(--ink) !important;
  }

  html.cr-embed[data-reader-theme='light'] code,
  html.cr-embed[data-reader-theme='light'] kbd {
    background: #f6f8fa !important;
    border-color: #d8dce3 !important;
  }

  html.cr-embed[data-reader-theme='light'] .toc a {
    border-bottom-color: var(--rule-strong) !important;
  }
}

@media (max-width: 700px) {
  html.cr-embed .doc {
    padding-top: 1.4rem !important;
  }
}
`;

const darkCss = String.raw`
:root {
  color-scheme: dark !important;
  --ink: #eaf1ff !important;
  --ink-soft: #b8c6e2 !important;
  --ink-mute: #8b9cbd !important;
  --rule: rgba(140, 172, 224, 0.22) !important;
  --rule-soft: rgba(140, 172, 224, 0.13) !important;
  --rule-strong: rgba(140, 172, 224, 0.34) !important;
  --paper: #070c18 !important;
  --paper-soft: #0c1426 !important;
  --paper-tint: #0a1222 !important;
  --accent: #7daaff !important;
  --accent-deep: #a9c8ff !important;
  --accent-soft: rgba(79, 140, 255, 0.2) !important;

  --c-goal: #b8c6e2;       --bg-goal: rgba(148, 163, 184, 0.06);  --br-goal: rgba(148, 163, 184, 0.24);
  --c-def: #7daaff;        --bg-def: rgba(79, 140, 255, 0.09);    --br-def: rgba(79, 140, 255, 0.28);
  --c-thm: #c9a6ff;        --bg-thm: rgba(139, 123, 255, 0.1);    --br-thm: rgba(139, 123, 255, 0.28);
  --c-proof: #a8b8d8;      --bg-proof: transparent;               --br-proof: rgba(168, 184, 216, 0.34);
  --c-ex: #5ee0c0;         --bg-ex: rgba(70, 226, 160, 0.08);     --br-ex: rgba(70, 226, 160, 0.26);
  --c-plain: #ffbd86;      --bg-plain: rgba(255, 154, 77, 0.1);   --br-plain: rgba(255, 154, 77, 0.3);
  --c-warn: #ff9b9b;       --bg-warn: rgba(255, 107, 107, 0.09);  --br-warn: rgba(255, 107, 107, 0.28);
  --c-note: #9fb3d6;       --bg-note: transparent;                --br-note: rgba(159, 179, 214, 0.24);
  --c-summary: #7ee2a1;    --bg-summary: rgba(70, 226, 160, 0.08);--br-summary: rgba(70, 226, 160, 0.26);
  --c-quiz: #f6a1c0;       --bg-quiz: rgba(244, 114, 182, 0.08);  --br-quiz: rgba(244, 114, 182, 0.26);

  --c-syntax: #8ab4ff;     --bg-syntax: rgba(79, 140, 255, 0.08); --hd-syntax: transparent;
  --c-trap: #ff9b9b;       --bg-trap: rgba(255, 107, 107, 0.08);  --hd-trap: transparent;
  --c-compiler: #b8c6e2;   --bg-compiler: rgba(148, 163, 184, 0.06); --hd-compiler: transparent;
  --c-standard: #ffce7a;   --bg-standard: rgba(255, 196, 77, 0.07); --hd-standard: transparent;
  --c-experiment: #5ee0c0; --bg-experiment: rgba(70, 226, 160, 0.07); --hd-experiment: transparent;
  --c-practice: #c9a6ff;   --bg-practice: rgba(139, 123, 255, 0.08); --hd-practice: transparent;
  --c-debug: #ffbd86;      --bg-debug: rgba(255, 154, 77, 0.08);  --hd-debug: transparent;
  --c-plain: #ffbd86;      --bg-plain: rgba(255, 154, 77, 0.1);   --hd-plain: transparent;
  --c-summary: #7ee2a1;    --bg-summary: rgba(70, 226, 160, 0.08);--hd-summary: transparent;
  --c-quiz: #f6a1c0;       --bg-quiz: rgba(244, 114, 182, 0.08);  --hd-quiz: transparent;

  --term-bg: #05080f;
  --term-ink: #dbe7ff;
  --term-head: #0c1426;
  --diag-bg: rgba(255, 107, 107, 0.06);
  --diag-hd: rgba(255, 107, 107, 0.12);
  --diag-ink: #ffb4b4;
  --mark-bg: rgba(255, 196, 77, 0.2);
  --mark-rule: #ff9a4d;
  --viz-bg: #0a1222;
}

html.cr-embed {
  background: #070c18 !important;
}

html.cr-embed body {
  min-height: 100vh;
  background:
    radial-gradient(ellipse 80% 42% at 50% -8%, rgba(79, 140, 255, 0.1), transparent 70%),
    #070c18 !important;
  color: var(--ink) !important;
  -webkit-font-smoothing: antialiased;
}

html.cr-embed .doc-title,
html.cr-embed .chapter-title,
html.cr-embed .unit-title {
  color: var(--ink) !important;
}

html.cr-embed .doc-kicker,
html.cr-embed .doc-meta,
html.cr-embed .chapter-meta,
html.cr-embed .doc-foot {
  color: var(--ink-mute) !important;
}

html.cr-embed a {
  color: var(--accent) !important;
  border-bottom-color: rgba(79, 140, 255, 0.28) !important;
}

html.cr-embed a:hover {
  color: var(--accent-deep) !important;
  border-bottom-color: var(--accent-deep) !important;
}

html.cr-embed strong {
  color: var(--ink);
}

html.cr-embed mark {
  background: rgba(255, 196, 77, 0.22) !important;
  color: #ffe1ad !important;
}

html.cr-embed ::selection {
  background: rgba(79, 140, 255, 0.32);
  color: #fff;
}

html.cr-embed ::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

html.cr-embed ::-webkit-scrollbar-track {
  background: transparent;
}

html.cr-embed ::-webkit-scrollbar-thumb {
  border: 3px solid transparent;
  border-radius: 9999px;
  background-clip: content-box;
  background-color: rgba(140, 172, 224, 0.28);
}

/* 目录、导航与页脚 */
html.cr-embed .toc {
  background: var(--paper-tint) !important;
  border-color: var(--rule) !important;
}

html.cr-embed .toc a {
  color: var(--ink-soft) !important;
  border-bottom-color: var(--rule-strong) !important;
}

html.cr-embed .unit-nav {
  border-top-color: var(--rule) !important;
  color: var(--ink-mute) !important;
}

html.cr-embed .doc-foot {
  border-top-color: var(--rule) !important;
}

/* 语义块：统一成深色卡片 + 彩色左条，标题带不再铺实色 */
html.cr-embed .box {
  border-radius: 10px !important;
  border-color: var(--rule) !important;
}

html.cr-embed .box > .box-h {
  background: transparent !important;
  color: var(--ink) !important;
  border-bottom: 1px solid var(--rule) !important;
  border-radius: 10px 10px 0 0 !important;
}

html.cr-embed .box > .box-h > .box-t,
html.cr-embed .box > .box-h .ico,
html.cr-embed .box > .box-h .box-kind {
  color: inherit !important;
}

html.cr-embed .box > .box-h > .box-t::before {
  color: var(--ink-mute) !important;
}

html.cr-embed .box-def > .box-h,
html.cr-embed .box-thm > .box-h,
html.cr-embed .box-ex > .box-h {
  background: transparent !important;
  color: var(--ink) !important;
}

html.cr-embed .box-def > .box-b > p > strong:first-child {
  color: var(--c-def) !important;
}

html.cr-embed .box-ex > .box-b > p > strong:first-child {
  color: var(--c-ex) !important;
}

html.cr-embed .box-standard > .box-b > p {
  border-left-color: rgba(255, 196, 77, 0.35) !important;
}

html.cr-embed .box-standard > .box-b > p:first-child {
  color: var(--ink-soft) !important;
}

html.cr-embed .box-proof {
  background: rgba(148, 163, 184, 0.04) !important;
}

html.cr-embed .box-note {
  background: rgba(148, 163, 184, 0.03) !important;
}

html.cr-embed .box table th,
html.cr-embed table th {
  background: rgba(255, 255, 255, 0.05) !important;
  color: var(--ink) !important;
}

html.cr-embed .box table th {
  border-color: var(--rule-strong) !important;
}

html.cr-embed .box-experiment .box-b code,
html.cr-embed .box-debug code,
html.cr-embed .machine-check code {
  background: rgba(255, 255, 255, 0.06) !important;
}

/* 代码与终端 */
html.cr-embed pre,
html.cr-embed code,
html.cr-embed kbd {
  border-color: var(--rule) !important;
}

html.cr-embed pre {
  background: var(--paper-soft) !important;
  color: var(--ink) !important;
}

html.cr-embed code,
html.cr-embed kbd {
  background: var(--paper-soft) !important;
  color: var(--ink) !important;
}

html.cr-embed .term {
  border-color: var(--rule) !important;
}

html.cr-embed .term-head {
  background: var(--paper-soft) !important;
  color: var(--ink-soft) !important;
  border-bottom-color: var(--rule) !important;
}

html.cr-embed .term-output .term-body {
  background: var(--term-bg) !important;
  color: var(--term-ink) !important;
}

html.cr-embed .term-diagnostic {
  background: var(--diag-bg) !important;
}

html.cr-embed .term-diagnostic .term-body {
  background: var(--diag-bg) !important;
  color: var(--diag-ink) !important;
}

html.cr-embed .term-session {
  background: #0a1222 !important;
  border-color: var(--rule) !important;
  border-left-color: rgba(140, 172, 224, 0.42) !important;
}

html.cr-embed .term-session .term-body {
  background: #0a1222 !important;
  color: var(--ink-soft) !important;
}

html.cr-embed .term-session .term-body .cl.is-text {
  color: var(--ink-soft) !important;
}

html.cr-embed .term-session .term-body .cl.is-cmd {
  color: #8ab4ff !important;
}

html.cr-embed .term-diagnostic .term-body .cl.is-err {
  color: var(--diag-ink) !important;
}

/* C 语言笔记的 Shiki 源码块是浅色主题：整块反相后保留语法色差 */
html.cr-embed[data-notes-reader-mode="c-engineering"] .codeblock {
  background: #0a1222 !important;
  border-color: var(--rule) !important;
  border-left-color: rgba(140, 172, 224, 0.4) !important;
}

html.cr-embed[data-notes-reader-mode="c-engineering"] .cb-head {
  background: rgba(255, 255, 255, 0.04) !important;
  border-bottom: 1px solid var(--rule) !important;
  color: var(--ink-soft) !important;
}

html.cr-embed[data-notes-reader-mode="c-engineering"] .cb-file,
html.cr-embed[data-notes-reader-mode="c-engineering"] .cb-lines {
  color: var(--ink-mute) !important;
}

html.cr-embed[data-notes-reader-mode="c-engineering"] .cb-title {
  color: var(--accent) !important;
}

/* 语言徽标在 Shiki 反相层之外，不跟着反转，得单独深色化 */
html.cr-embed[data-notes-reader-mode="c-engineering"] .cb-lang {
  background: rgba(255, 255, 255, 0.06) !important;
  border-color: var(--rule-strong) !important;
  color: var(--ink-soft) !important;
}

/* 行尾旁注在反相层内部：这里写的是「反转前」的颜色，越浅的底反转后越深 */
html.cr-embed[data-notes-reader-mode="c-engineering"] .codeblock .k-note {
  background: #fff1c2 !important;
  border-color: #c9a227 !important;
  color: #4a3a00 !important;
}

html.cr-embed[data-notes-reader-mode="c-engineering"] .cb-body {
  background: transparent !important;
}

/* C 源码块的 DOM 里 pre.code 与每行的 span.code 同名：
   只反相最外层 pre，若写成 .code 会让内层再反一次，语法色整体错乱 */
html.cr-embed[data-notes-reader-mode="c-engineering"] .codeblock pre.code {
  background: #f4f7fd !important;
  filter: invert(0.92) hue-rotate(180deg);
}

html.cr-embed[data-notes-reader-mode="c-engineering"] .cb-notes {
  background: rgba(255, 255, 255, 0.04) !important;
  border-top-color: var(--rule) !important;
  color: var(--ink-soft) !important;
}

html.cr-embed[data-notes-reader-mode="c-engineering"] .viz {
  background: var(--viz-bg) !important;
  border-color: var(--rule) !important;
}

html.cr-embed .viz-title {
  border-bottom-color: var(--rule) !important;
}

html.cr-embed .viz-title .viz-kind {
  background: rgba(255, 255, 255, 0.06) !important;
  border-color: var(--rule-strong) !important;
  color: var(--ink-soft) !important;
}

html.cr-embed[data-notes-reader-mode="c-engineering"] .vs-tab {
  background: rgba(255, 255, 255, 0.04) !important;
  color: var(--ink-soft) !important;
  border-color: var(--rule-strong) !important;
}

html.cr-embed[data-notes-reader-mode="c-engineering"] .vs-tab:hover {
  color: var(--accent) !important;
  border-color: var(--accent) !important;
}

/* 选中的步骤标签：原样式是浅蓝底白字，深色下白字看不清，换成深字 */
html.cr-embed .viz-screen :is(
  .vs-radio:nth-of-type(1):checked ~ .vs-bar > .vs-tab[data-step="1"],
  .vs-radio:nth-of-type(2):checked ~ .vs-bar > .vs-tab[data-step="2"],
  .vs-radio:nth-of-type(3):checked ~ .vs-bar > .vs-tab[data-step="3"],
  .vs-radio:nth-of-type(4):checked ~ .vs-bar > .vs-tab[data-step="4"],
  .vs-radio:nth-of-type(5):checked ~ .vs-bar > .vs-tab[data-step="5"],
  .vs-radio:nth-of-type(6):checked ~ .vs-bar > .vs-tab[data-step="6"],
  .vs-radio:nth-of-type(7):checked ~ .vs-bar > .vs-tab[data-step="7"],
  .vs-radio:nth-of-type(8):checked ~ .vs-bar > .vs-tab[data-step="8"],
  .vs-radio:nth-of-type(9):checked ~ .vs-bar > .vs-tab[data-step="9"],
  .vs-radio:nth-of-type(10):checked ~ .vs-bar > .vs-tab[data-step="10"],
  .vs-radio:nth-of-type(11):checked ~ .vs-bar > .vs-tab[data-step="11"],
  .vs-radio:nth-of-type(12):checked ~ .vs-bar > .vs-tab[data-step="12"]
) {
  background: var(--accent) !important;
  border-color: var(--accent) !important;
  color: #071022 !important;
  font-weight: 700;
}

/* 图元节点：原主题是白色卡片 + 深绿/深红状态色，在深色面板里需要整体反转为浅色 */
html.cr-embed .viz .vn .vn-text {
  background: rgba(255, 255, 255, 0.055) !important;
  border-color: var(--rule-strong) !important;
  color: var(--ink-soft) !important;
  box-shadow: none !important;
}

html.cr-embed .viz .vn[data-new="lesson"] .vn-text {
  color: #7ee2a1 !important;
}

html.cr-embed .viz .vn[data-new="step"] .vn-text {
  color: var(--accent) !important;
}

html.cr-embed .viz .vn[data-state="visited"] .vn-text {
  background: rgba(70, 226, 160, 0.1) !important;
  border-color: rgba(70, 226, 160, 0.45) !important;
  color: #7ee2a1 !important;
}

html.cr-embed .viz .vn[data-state="active"] .vn-text {
  background: rgba(244, 114, 182, 0.12) !important;
  border-color: rgba(244, 114, 182, 0.5) !important;
  color: #f6a1c0 !important;
}

html.cr-embed .viz .vn[data-state="pending"] .vn-text {
  color: var(--ink-mute) !important;
}

html.cr-embed .viz .vn-tag {
  color: var(--accent-deep) !important;
}

html.cr-embed .viz .vn[data-new="lesson"] .vn-tag {
  color: #7ee2a1 !important;
}

html.cr-embed .viz .vn[data-new="step"] .vn-tag {
  color: var(--accent) !important;
}

/* 可见性图的边标签写死成深灰，深色面板上几乎看不见 */
html.cr-embed .viz[data-kind="visibility"] .ve .ve-lbl {
  color: var(--ink-soft) !important;
}

/* 进入/返回箭头原色是深橙/深紫，深色底上提亮 */
html.cr-embed .viz .ve[data-arrow="ret"] .ve-arrow {
  color: #ffbd86 !important;
}

html.cr-embed .viz .ve[data-arrow="both"] .ve-arrow {
  color: #c9a6ff !important;
}

/* 图例里的「源码块」色板是白底，深色下换成深色样本 */
html.cr-embed .legend .sw-code {
  background: #0a1222 !important;
  border-left-color: #526078 !important;
}

/* 函数图像：只有面板底色是硬编码白 */
html.cr-embed .plot-svg .plot-panel {
  fill: #0a1222 !important;
  stroke: var(--rule) !important;
}

html.cr-embed .plot-svg .plot-grid line {
  stroke: var(--rule-soft) !important;
}

html.cr-embed .plot-svg .plot-axis line {
  stroke: var(--ink-soft) !important;
}

html.cr-embed .plot-svg .plot-ticks text,
html.cr-embed .plot-svg .plot-legend text {
  fill: var(--ink-mute) !important;
}

html.cr-embed .plot-svg .plot-marks text {
  fill: var(--ink) !important;
}
`;

export function notesReaderCss(theme: ReaderTheme): string {
  return theme === 'dark' ? `${baseCss}\n${darkCss}` : baseCss;
}
