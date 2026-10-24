---
title: 用 import.meta.glob 收集内容仓库
tags: [post, 前端]
date: 2026-10-23
summary: 内容系统的地基：把 src/content 下的文件变成可按标签查询的 registry。
---

## 为什么不用数据库

个人站的「内容管理」其实只有一个需求：**把目录下的文件变成可查询的列表**。为此引入数据库或静态 CMS 都太重了。Vite 的 `import.meta.glob` 在构建期就能做到这件事：

```ts
const RAW_MODULES = import.meta.glob('../content/**/*.{html,md}', {
  query: '?raw',
  import: 'default',
  eager: true,
});
```

三个要点：

1. **glob 模式相对导入文件解析**——`registry.ts` 在 `src/content-system/` 下，所以要写 `../content/**`；
2. **`query: '?raw'`** 拿到原始文本，frontmatter 自己解析，不引入额外依赖；
3. **`eager: true`** 让内容在构建期就位，运行时没有异步加载的瀑布。

## slug 与 type 的约定

slug 就是路由参数，直接从文件名来：

| 文件 | slug | type |
| --- | --- | --- |
| `post/hello-codrift.md` | `hello-codrift` | `markdown` |
| `post/why-self-host.extend.md` | `why-self-host` | `markdownWithExtend` |
| `demo/particle-demo.html` | `particle-demo` | `html` |

`.extend.md` 这个双后缀是刻意的：文件名一眼能看出渲染方式，也不用往 frontmatter 里塞 `type` 字段。

## 查询面

registry 最后只暴露四个函数，复杂度全部收在构建期：

```ts
getAllEntries(); // 按 date 降序，无 date 的排最后
getEntryBySlug(slug);
getEntriesByTag(tag); // 'home' 取首页板块，'post' 取博客文章
getAllTags();
```

首页和博客列表读的是同一份 registry，区别只在查询用的标签：页面不再各自维护内容清单，加一篇文章就是加一个文件。

## 下一步

内容渲染成 HTML 之后还有一段路：markdown 的排版、扩展语法、html 类型的隔离渲染。这些留给下一篇文章。
