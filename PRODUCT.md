# Codrift · 产品真相

> 这份文档只记录**产品事实**（谁、是什么、必须成立什么），不记录视觉决策——视觉归 DESIGN.md。
> 由 UI 重设计会话于 2026-10-24 与站长确认后落笔；事实变更须先问站长。

## 是谁

- **品牌**：Codrift（codrift.space）。codrift 是品牌名，个人博客也挂在这个域名下。
- **站长**：lumenShen（GitHub: https://github.com/lumenShen/）。
- **联系方式**：gozaoo@outlook.com（唯一公开联系方式）。
- **身份提及**：桂林电子科技大学——**只以一句话顺带提及，不做任何高亮/徽章/图标强调**（站长明确要求）。
- **一句话定位**：一个人的代码漂流站；代码与想法，漂流至此。

## 是什么

一个静态个人站，三块内容：

1. **主页**：完全可折叠的板块系统（关于/联系方式/技能近况/作品集/博客速览），默认仅「关于」展开，可全部展开/收起。
2. **作品集**：GitHub 项目卡片。**Rein 是旗舰**（最突出），另有 BlurLyric（已归档，卡片保留，链接指向其真实所在仓库 Project-And-Factory/BlurLyric，简介已注明归属存疑）、EffiBuddy、Chordial、Rein-hub。
3. **博客**：文章列表（标签筛选）+ 文章页，三种内容类型（html / markdown / markdownWithExtend）。

## 必须成立

- **标签驱动的 main-content 解析系统**是全站内容地基：主页板块正文也必须经它渲染，不许在页面里写死正文。三种可输出类型：`html`（可链接 css/js/资源，隔离渲染）、`markdown`、`markdownWithExtend`（自实现扩展语法）。首页正文归 `src/content/home/**`（tag `home`），博客归 `src/content/**`（tag `post`）。
- **动效四件套**（站长点名）：GradualBlur 悬浮页头、GhostCursor 首页背景、PixelTrail 科技感点缀（**视觉必须明显减弱**）、TargetCursor 指针到可交互目标时的动画。全部要有 `prefers-reduced-motion` 降级。
- **液态玻璃按钮**：GlassSurface 移植自 Rein，材质默认值固定为 borderWidth 0.02 / brightness 50 / opacity 0.95 / blur 6 / mapScale 4 / distortionScale -150 / displace 2.0 / saturation 1.4 / backgroundOpacity 0.72；GlassButton 是其胶囊封装。**本站恒为深色**，玻璃必须走暗色 tint（不跟随系统亮色）。
- **技术约束**：Vue 3 + Vite + TypeScript；Vue Router **Hash 模式**（`createWebHashHistory`）；`vite.config.js` 的 `base: '/'`；部署 GitHub Pages 自定义根域名（`public/CNAME` = codrift.space）。
- **CI**：`deploy.yml`（push main → npm ci → build → Pages 部署）+ `blog.yml`（issue 打 `blog` 标签 → 生成文章 → 自动提交），后者的扩展点写在文件注释与 `docs/BLOG.md`。
- **不做**：不擅自 git 提交/推送；不改站长提供的事实性文案（邮箱、项目简介、桂电提及方式）。

## 这个界面要成功，访客要能

- 3 秒内认出这是 lumenShen 的个人站（不是又一个模板作品集）。
- 一眼看到两个真实行动：**看看博客**、**联系我**（mailto）。
- 顺手展开折叠板块，读到关于/作品/博客的真实内容。

## 视觉方向的来处

站长用两张截图钉死了方向：参考站 kexie.space（深色科技风：巨型双色标题、斜向极光光带、胶囊按钮组、右上实底 CTA），当前站为反例（页头糊成白团、hero 过于单薄）。本方向的记录见 index.html 顶部的 DIRECTION CONTRACT 与 DESIGN.md。
