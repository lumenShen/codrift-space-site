/*
 * 内容系统自测脚本（node 可运行）。
 *
 * 用法：构建后执行（项目根目录）：
 *   npx vite build --config src/content-system/vite.selftest.config.mjs
 *   node src/content-system/.selftest-out/selftest.mjs
 *
 * 它通过真实的 Vite 构建验证 import.meta.glob 收集、frontmatter 解析、
 * 扩展语法管线、extend 组件切分与 html 条目的资产解析/iframe 文档组装。
 * 运行结果全部打印到控制台；有失败项时以非零退出码结束。
 */

import { defineComponent } from 'vue';
import type { VNode } from 'vue';
import {
  buildTagHref,
  getAllEntries,
  getAllTags,
  getEntriesByTag,
  getEntryBySlug,
  registerExtendComponent,
  renderEntry,
} from './index';
import { parseFrontmatter } from './frontmatter';
import { getEntrySource } from './registry';
import { buildHtmlFrameDocument, resolveContentRaw, resolveContentUrl } from './extend/htmlFrame';
import { renderExtendedMarkdown, renderMarkdownDoc } from './extend/pipeline';
// side-effect import：页面侧扩展语法（::: 六件套 + {{kbd}}）经冻结扩展点注册进管线。
// 必须先于下方渲染用例执行（模块加载即注册）。
import '../components/extend/extend-syntax';

let total = 0;
let failures = 0;

function check(condition: boolean, label: string): void {
  total += 1;
  if (condition) {
    console.log(`  ok   - ${label}`);
  } else {
    failures += 1;
    console.error(`  FAIL - ${label}`);
  }
}

function section(title: string): void {
  console.log(`\n[${title}]`);
}

/* ---------- frontmatter 解析 ---------- */

section('frontmatter 解析');

const fm1 = parseFrontmatter('---\ntitle: "Hi: there"\ntags: [post, 建站]\ndate: 2026-10-24\n---\n\n正文');
check(fm1.data.title === 'Hi: there', '引号包裹且含冒号的 title');
check(
  Array.isArray(fm1.data.tags) && fm1.data.tags.length === 2 && fm1.data.tags[0] === 'post',
  '行内数组 tags',
);
check(fm1.data.date === '2026-10-24', 'date 按字符串保留');
check(fm1.body === '\n正文', 'frontmatter 之后的正文');

const fm2 = parseFrontmatter('---\ntitle: 块序列\ntags:\n  - post\n  - 随笔\n---\nbody');
check(
  Array.isArray(fm2.data.tags) && fm2.data.tags[1] === '随笔',
  '块序列 tags（hello-codrift.md 的写法）',
);

const fm3 = parseFrontmatter('没有 frontmatter 的普通文本');
check(Object.keys(fm3.data).length === 0 && fm3.body === '没有 frontmatter 的普通文本', '无 frontmatter 原样返回');

const fm4 = parseFrontmatter('---\ntitle: 没有闭合\nbody 永远是 body');
check(fm4.body.includes('body 永远是 body'), '未闭合 frontmatter 兜底');

/* ---------- registry ---------- */

section('registry（import.meta.glob 收集真实 src/content 文件）');

const all = getAllEntries();
check(all.length === 10, `getAllEntries 共 10 条（实际 ${all.length}）`);

const types = new Map(all.map((entry) => [entry.slug, entry.type]));
check(types.get('about') === 'markdownWithExtend', 'about.extend.md → markdownWithExtend');
check(types.get('hello-codrift') === 'markdown', 'hello-codrift.md → markdown');
check(types.get('particle-demo') === 'html', 'particle-demo.html → html');
check(types.get('design-system') === 'markdownWithExtend', 'design-system.extend.md → markdownWithExtend');

const homeEntries = getEntriesByTag('home');
const postEntries = getEntriesByTag('post');
check(homeEntries.length === 4, `tag 'home' 命中 4 块首页板块（实际 ${homeEntries.length}）`);
check(postEntries.length === 5, `tag 'post' 命中 5 篇博客（实际 ${postEntries.length}）`);
check(getEntriesByTag('HOME').length === 0, 'tag 查询大小写敏感');

check(
  all[0]?.slug === '2026-10-24-xiaomi-sound-party-eq' &&
    all[1]?.slug === 'design-system' &&
    all[2]?.slug === 'now' &&
    all[3]?.slug === 'particle-demo',
  'date 降序（同日按 slug，数字前缀排字母前）',
);
const postSlugs = postEntries.map((entry) => entry.slug);
check(
  postSlugs.join(',') ===
    '2026-10-24-xiaomi-sound-party-eq,design-system,glob-content-store,why-self-host,hello-codrift',
  `博客按 date 降序（实际 ${postSlugs.join(',')}）`,
);
check(all[all.length - 1]?.slug === 'skills', '无 date/最早 date 的排最后');

const tags = getAllTags();
check(
  ['home', 'post', '随笔', '建站', '前端', 'demo'].every((tag) => tags.includes(tag)) &&
    new Set(tags).size === tags.length,
  `getAllTags 去重且含全部标签（实际 ${tags.join('、')}）`,
);

check(getEntryBySlug('particle-demo')?.title === '粒子指针 · 迷你演示', 'getEntryBySlug');
check(getEntryBySlug('nonexistent') === undefined, '未知 slug 返回 undefined');

/* ---------- 扩展语法管线 ---------- */

section('markdownWithExtend 管线');

const whyBody = getEntrySource('why-self-host')?.body ?? '';
const whyHtml = renderExtendedMarkdown(whyBody, { slug: 'why-self-host', dir: 'post' });

check(whyHtml.includes('ce-callout ce-callout--note'), ':::note 容器渲染');
check(whyHtml.includes('ce-callout--warn') && whyHtml.includes('代价'), ':::warn 容器与标题');
check(whyHtml.includes('ce-badge ce-badge--accent'), '徽章（默认 variant）');
check(whyHtml.includes('ce-linkcard') && whyHtml.includes('vite.dev'), '链接卡与 host');
check(
  whyHtml.includes(`href="${buildTagHref('前端')}"`) && whyHtml.includes(`href="${buildTagHref('随笔')}"`),
  `{{tag}} 渲染为 hash 路由链接（${buildTagHref('前端')}）`,
);
check(whyHtml.includes('{{tag:建站}}'), '代码块内的 {{tag}} 保持字面文本（代码感知）');
check(whyHtml.includes('{{badge:徽章}}') && whyHtml.includes(':::warn 注意'), '代码块内的容器/徽章示例未被转换');
check(whyHtml.includes('<h2>') && whyHtml.includes('<p>'), '标题/段落等 markdown 结构完好');

const globHtml = renderMarkdownDoc(getEntrySource('glob-content-store')?.body ?? '');
check(globHtml.includes('<table>') && globHtml.includes('markdownWithExtend'), '纯 markdown 类型的表格渲染（glob-content-store）');

const aboutBody = getEntrySource('about')?.body ?? '';
const aboutHtml = renderExtendedMarkdown(aboutBody, { slug: 'about', dir: 'home' });
check(aboutHtml.includes('<!-- extend:TagCloud -->'), 'extend 占位注释原样透传给组件层切分');

/* ---------- 扩展组件语法（::: 轨道 B 六件套 + {{kbd}} 轨道 C） ---------- */

section('扩展组件语法（::: 六件套 + {{kbd}}）');

const renderExt = (src: string): string => renderExtendedMarkdown(src, { slug: 'selftest-syntax', dir: 'post' });

// :::timeline
const tl = renderExt(
  [':::timeline', '- 2026-10-20 | 第一篇 | Hello, Codrift', '- 2026-10-24 | **扩展语法上线** | 七件套', ':::'].join('\n'),
);
check(tl.includes('ce-timeline') && !tl.includes('ce-callout--timeline'), ':::timeline 重写为时间线组件');
check(tl.includes('ce-timeline__time') && tl.includes('2026-10-20'), '时间列渲染');
check(tl.includes('ce-timeline__item--hot'), '标题段 **加粗** → 关键节点');
check(tl.includes('ce-timeline__desc') && tl.includes('Hello, Codrift'), '描述列渲染');
const tlNoDesc = renderExt([':::timeline', '- 2026-10-24 | 只有日期和标题', ':::'].join('\n'));
check(tlNoDesc.includes('ce-timeline__title') && !tlNoDesc.includes('ce-timeline__desc'), '描述可缺省');
const tlBare = renderExt([':::timeline', '- 只有一段的条目', ':::'].join('\n'));
check(tlBare.includes('ce-timeline__title') && !tlBare.includes('ce-timeline__time'), '无竖线的单段条目按标题处理');

// :::stat-grid
const sg = renderExt([':::stat-grid', '- **4** | 篇博客', '- 3 | 种类型', ':::'].join('\n'));
check(sg.includes('ce-stat-grid') && sg.includes('ce-stat__value') && sg.includes('ce-stat__label'), ':::stat-grid 渲染数值网格');
check(sg.includes('ce-stat--hot'), '数值段 **加粗** → 高亮项');

// :::faq
const fq = renderExt(
  [':::faq', '- 代码块里生效吗？| 不会，**保持字面**', '- 文章在哪？| src/content', ':::'].join('\n'),
);
check(fq.includes('<details class="ce-faq__item">') && fq.includes('<summary class="ce-faq__q">'), ':::faq 渲染 details/summary');
check(fq.includes('ce-faq__a') && fq.includes('src/content') && fq.includes('<strong>保持字面</strong>'), '答案区含行内 markdown');

// :::steps
const st = renderExt([':::steps', '1. 建文件 | src/content 下', '2. 写 frontmatter | title/tags', ':::'].join('\n'));
check(st.includes('<ol class="ce-steps">') && st.includes('ce-steps__num'), ':::steps 渲染有序步骤');
check(st.includes('ce-steps__num">2<'), '步骤编号正确');

// :::feature-grid
const fg = renderExt([':::feature-grid', '- code | 前端 | Vue 3 + Vite', '- nosuch-icon | 未知 | 回退圆点', ':::'].join('\n'));
check(fg.includes('ce-feature-grid') && fg.includes('ce-feature__icon-svg'), ':::feature-grid 渲染图标卡');
check(fg.includes('ce-feature__icon-dot'), '未知图标名回退实心圆点');

// :::gallery（含列数参数与内容资产相对引用解析）
const gl = renderExt([':::gallery 3', '- ![标记](../demo/codrift-mark.svg) 站点 mark', ':::'].join('\n'));
check(gl.includes('ce-gallery') && gl.includes('data-cols="3"'), ':::gallery 开栏参数 → 桌面列数');
check(gl.includes('ce-gallery__item') && gl.includes('<figcaption') && gl.includes('站点 mark'), 'figure/figcaption 结构与说明文字');
check(
  gl.includes('ce-gallery__link') && (gl.includes('data:') || gl.includes('codrift-mark')),
  '相对图片引用经 resolveContentUrl 解析为构建地址',
);
const glAbs = renderExt([':::gallery', '- ![绝对路径](/site-absolute.png) 不改写', ':::'].join('\n'));
check(glAbs.includes('data-cols="2"') && glAbs.includes('src="/site-absolute.png"'), '缺省 2 列；站内绝对路径原样保留');

// {{kbd:...}}
const kb = renderExt('按 {{kbd:Ctrl|K}} 打开');
check(
  kb.includes('<kbd class="ce-kbd">Ctrl</kbd>') &&
    kb.includes('<span class="ce-kbd-plus">+</span>') &&
    kb.includes('<kbd class="ce-kbd">K</kbd>'),
  '{{kbd:A|B}} 渲染为键帽组合',
);
const kbSingle = renderExt('按 {{kbd:Esc}} 关闭');
check(kbSingle.includes('<kbd class="ce-kbd">Esc</kbd>') && !kbSingle.includes('ce-kbd-plus'), '{{kbd:A}} 单键无连接符');
const kbFence = renderExt('```\n{{kbd:Ctrl|K}}\n```');
check(kbFence.includes('{{kbd:Ctrl|K}}') && !kbFence.includes('<kbd'), '围栏代码块内 {{kbd}} 保持字面');
const kbInline = renderExt('行内 `{{kbd:Ctrl|K}}` 原样');
check(kbInline.includes('{{kbd:Ctrl|K}}') && !kbInline.includes('<kbd'), '行内代码内 {{kbd}} 保持字面');

// 行内代码中的 | 不作分隔符（深度感知切分）
const pipeGuard = renderExt([':::stat-grid', '- **2** | 管线 `a|b`', ':::'].join('\n'));
check(
  pipeGuard.includes('<code>a|b</code>') && (pipeGuard.match(/ce-stat__value/g) ?? []).length === 1,
  '条目中行内代码里的 | 不被切分',
);

// 兜底：具名容器内没有列表时保持 callout 呈现（内容不丢）
const fallback = renderExt([':::timeline', '没有列表的正文。', ':::'].join('\n'));
check(fallback.includes('ce-callout--timeline') && fallback.includes('没有列表的正文'), '无法解析时退化为普通容器');

/* ---------- 种子内容《本站的设计系统》：全组件演练场 ---------- */

section('种子内容《本站的设计系统》');

const dsEntry = getEntryBySlug('design-system');
check(dsEntry !== undefined && dsEntry.tags.includes('post'), 'design-system 条目存在且 tags 含 post');
const dsBody = getEntrySource('design-system')?.body ?? '';
const dsHtml = renderExtendedMarkdown(dsBody, { slug: 'design-system', dir: 'post' });
for (const cls of ['ce-timeline', 'ce-stat-grid', 'ce-faq', 'ce-steps', 'ce-feature-grid', 'ce-gallery', 'ce-kbd']) {
  check(dsHtml.includes(cls), `种子文章渲染出 ${cls}`);
}
check(dsHtml.includes('ce-timeline__item--hot'), '种子文章时间线含关键节点');
check(dsHtml.includes('data-cols="3"'), '种子文章图册为 3 列');
check(dsHtml.includes('{{kbd:Ctrl|K}}'), '种子文章代码块内的 {{kbd}} 语法保持字面');
check(dsHtml.includes(':::timeline'), '种子文章代码块内的 ::: 语法保持字面');
check(dsHtml.includes('ce-callout--note') && dsHtml.includes('ce-callout--tip'), '种子文章存量 :::note/:::tip 不回归');


/* ---------- extend 组件切分与注册 ---------- */

section('extend 组件切分与注册');

const tagCloudDef = defineComponent({
  name: 'TagCloud',
  render: () => null,
});
registerExtendComponent('TagCloud', tagCloudDef);

const aboutEntry = getEntryBySlug('about');
check(aboutEntry !== undefined, 'about 条目存在');
if (aboutEntry !== undefined) {
  const comp = renderEntry(aboutEntry) as { setup?: () => () => VNode };
  const renderFn = typeof comp.setup === 'function' ? comp.setup() : null;
  const tree = typeof renderFn === 'function' ? renderFn() : null;
  const nodes: VNode[] = [];
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node === null || typeof node !== 'object') return;
    const v = node as VNode;
    nodes.push(v);
    if (v.children !== null) walk(v.children);
  };
  if (tree !== null) walk(tree);
  check(
    typeof renderFn === 'function' && tree !== null,
    'renderEntry 返回的组件 setup 可产出渲染树',
  );
  check(nodes.some((v) => v.type === tagCloudDef), '<!-- extend:TagCloud --> 被替换为注册的组件实例');
  check(
    nodes.filter((v) => typeof v.type === 'string' && v.type === 'div' && String((v.props as { class?: unknown } | null)?.class ?? '').includes('ce-markdown')).length >= 1,
    'HTML 段挂在 .ce-markdown 容器里',
  );
}

/* ---------- html 条目：资产解析与 iframe 文档 ---------- */

section('html 条目（iframe 隔离渲染）');

const cssRaw = resolveContentRaw('./particle-demo.css', 'demo');
check(
  cssRaw !== null && cssRaw.path === 'demo/particle-demo.css' && cssRaw.content.includes('#stage'),
  'css 相对引用解析到内容源文件（供内联）',
);
const svgUrl = resolveContentUrl('codrift-mark.svg', 'demo');
check(
  svgUrl !== null && (svgUrl.startsWith('data:') || svgUrl.endsWith('.svg')),
  `img 相对引用解析到资产 URL/data URI（${svgUrl === null ? 'null' : svgUrl.slice(0, 40)}…）`,
);
check(resolveContentUrl('https://cdn.example.com/x.js', 'demo') === null, '外链原样保留');
check(resolveContentUrl('/site-absolute.png', 'demo') === null, '站内绝对路径原样保留');
check(resolveContentRaw('./no-such-asset.css', 'demo') === null, '缺失资产返回 null（dev 下会告警）');

const demoBody = getEntrySource('particle-demo')?.body ?? '';
const frame = buildHtmlFrameDocument(demoBody, 'demo');
check(frame.missing.length === 0, `资产引用全部解析成功（missing = ${frame.missing.length}）`);
check(
  frame.srcdoc.includes('<style data-src="demo/particle-demo.css">') && frame.srcdoc.includes('crosshair'),
  'srcdoc 中的 <link> 已内联为 <style>',
);
check(
  frame.srcdoc.includes('<script data-src="demo/particle-demo.js">') && frame.srcdoc.includes('requestAnimationFrame'),
  'srcdoc 中的 <script src> 已内联为 <script>',
);
check(
  svgUrl !== null && frame.srcdoc.includes(`src="${svgUrl}"`),
  'srcdoc 中的 <img> 已重写到资产 URL',
);
check(!frame.srcdoc.includes('<link'), '<link> 原始引用已消失（内联完成）');
check(!/<script\s+src="/.test(frame.srcdoc), 'srcdoc 不再包含外部 script 引用');
check(frame.srcdoc.startsWith('<!DOCTYPE html>'), 'srcdoc 是完整文档');

check(buildTagHref('随笔') === `#/blog?tag=${encodeURIComponent('随笔')}`, 'buildTagHref 输出 hash 路由地址');

/* ---------- 汇总 ---------- */

console.log(`\n共 ${total} 项，失败 ${failures} 项`);
if (failures > 0) {
  throw new Error(`selftest 失败：${failures} 项未通过`);
}
console.log('selftest 全部通过');
