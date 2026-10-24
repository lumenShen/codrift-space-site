#!/usr/bin/env node
/**
 * scripts/issue-to-post.mjs — GitHub Issue → 博客文章（markdown）→ commit & push
 *
 * 由 .github/workflows/blog.yml 在「issue 带 blog 标签」时调用。
 * 仅用 Node 内置能力（node:fs / node:path / node:child_process / 全局 fetch），
 * 无任何 npm 依赖，Node >= 18 即可运行（CI 固定 Node 22，本地 v26 已验证）。
 *
 * 流程：
 *   1. 调 GitHub API（process.env.GITHUB_TOKEN + 全局 fetch）取 issue 的
 *      标题 / 正文 / 标签 / 创建时间；
 *   2. 生成 src/content/posts/<YYYY-MM-DD>-<slug>.md
 *      frontmatter：title、tags（固定含 post + 除 blog 外的 issue 标签）、
 *      date、type: markdown（与 docs/CONTRACTS.md §2.1/2.2 对齐；
 *      contract 里 type 由扩展名决定，此处按管线规范冗余写入，解析器按扩展名覆盖也无害）；
 *   3. 配置 git identity（github-actions[bot]）→ add → commit → push 回默认分支（main）。
 *
 * 幂等性：同一 issue 永远映射到同一文件（日期取 issue.created_at，不取运行日）；
 * issue 被 edited 事件再次触发时覆盖原文件而不是新建重复文件。
 * 正文首行埋不可见标记 <!-- codrift-issue:<n> --> 用于把磁盘上的文件归属到 issue。
 *
 * ⚠️ 已知限制：用仓库自带 GITHUB_TOKEN 推送的 commit 不会触发 on: push 的
 *    deploy.yml（GitHub 对 GITHUB_TOKEN 触发的事件不新建 workflow run，官方规则）。
 *    文章提交后需要手动触发 deploy.yml，或按下方「扩展点」改造。
 *
 * 本地测试钩子（也是扩展点）：
 *   ISSUE_JSON_FILE=path  跳过 API，从本地 JSON 文件读 issue（可离线测全流程）
 *   POSTS_DIR=dir         覆盖输出目录（默认 src/content/posts）
 *   DRY_RUN=1             只生成文件，不执行任何 git 操作
 *
 * 扩展点（预留，改动集中在下面 marked 区块附近）：
 *   [未来] 定时拉 RSS：给 blog.yml 加 schedule 触发，复用 writePost()，来源换成 RSS 解析；
 *   [未来] issue comment 追加更新：监听 issue_comment 事件，按标记定位文件后 append 正文；
 *   [未来] frontmatter 增加 summary：从正文第一段截取，写入 writePost() 的 meta；
 *   [未来] 自动 redeploy：换 PAT secret 推送（会触发 on: push），或 blog.yml
 *          加 actions:write 权限后用 API dispatch deploy.yml，或直接并入部署 job。
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const POSTS_DIR = process.env.POSTS_DIR || 'src/content/posts';
const DRY_RUN = process.env.DRY_RUN === '1';
const MARKER_PREFIX = '<!-- codrift-issue:';
const EXCLUDED_LABELS = new Set(['blog']); // blog 是管线触发标签，不进文章 tags

const log = (...msg) => console.log('[issue-to-post]', ...msg);
const die = (msg) => {
  console.error('[issue-to-post] FATAL:', msg);
  process.exit(1);
};

/* ---------------------------------------------------------------- fetch issue */

async function fetchIssue() {
  // 扩展点：新增内容源（RSS / 本地 markdown / API v4 GraphQL）在这里并列加一个分支
  if (process.env.ISSUE_JSON_FILE) {
    const raw = JSON.parse(readFileSync(process.env.ISSUE_JSON_FILE, 'utf8'));
    log(`loaded issue #${raw.number} from ${process.env.ISSUE_JSON_FILE} (offline hook)`);
    return raw;
  }

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY; // Actions 自动注入，如 lumenShen/codrift-space-site
  const issueNumber = process.env.ISSUE_NUMBER;
  if (!token) die('GITHUB_TOKEN is not set (workflow must pass github.token).');
  if (!repo) die('GITHUB_REPOSITORY is not set.');
  if (!issueNumber || !/^\d+$/.test(issueNumber)) die('ISSUE_NUMBER must be a numeric env var.');

  const url = `https://api.github.com/repos/${repo}/issues/${issueNumber}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'codrift-issue-to-post',
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    die(`GitHub API ${res.status} ${res.statusText} for ${url}\n${body.slice(0, 300)}`);
  }
  const issue = await res.json();

  // issues API 对 PR 也返回条目；PR 打了 blog 标签不应生成文章
  if (issue.pull_request) {
    log(`#${issueNumber} is a pull request — skipped.`);
    process.exit(0);
  }
  return issue;
}

/* ---------------------------------------------------------------- slug & tags */

function slugify(title) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // 中文等非 ASCII 会被清空 → 走 fallback
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
  return slug || 'issue'; // 空兜底：文件名还有 -<issue号> 后缀保唯一
}

function buildTags(issue) {
  const labels = (issue.labels ?? []).map((l) => l.name).filter((n) => !EXCLUDED_LABELS.has(n));
  return [...new Set(['post', ...labels])]; // tag 约定见 docs/BLOG.md：post 必带
}

/* ------------------------------------------------------- write markdown entry */

// JSON.stringify 产出的双引号转义串是合法的 YAML 双引号标量（YAML 1.2 是 JSON 超集），
// 标题/标签里的引号、冒号、中文都安全
const yamlStr = (s) => JSON.stringify(String(s));

function renderPost(issue) {
  const date = String(issue.created_at).slice(0, 10); // YYYY-MM-DD，取创建日保证幂等
  const tags = buildTags(issue);
  const body = String(issue.body ?? '').replace(/\r\n/g, '\n').trim();
  const marker = `${MARKER_PREFIX}${issue.number} -->`;
  return {
    date,
    tags,
    slug: `${slugify(issue.title)}-${issue.number}`, // 带 issue 号：标题相同/全中文也不撞名
    content: `---
title: ${yamlStr(issue.title)}
tags: [${tags.map(yamlStr).join(', ')}]
date: ${yamlStr(date)}
type: markdown
---

${marker}

${body}
`,
  };
}

function resolveTarget(dir, post, issueNumber) {
  const target = `${post.date}-${post.slug}.md`;

  // 该 issue 已有旧文件（可能因标题改动而改名）→ 删旧写新，保持一 issue 一文件
  let ownerFile = null;
  if (existsSync(dir)) {
    for (const name of readdirSync(dir)) {
      if (!name.endsWith('.md')) continue;
      const m = readFileSync(join(dir, name), 'utf8').match(/<!-- codrift-issue:(\d+) -->/);
      if (m && Number(m[1]) === issueNumber) ownerFile = name;
    }
  }

  // 目标文件名已被占用（别的 issue 或无标记的手工文件）→ 追加 -i<issue号> 消歧，
  // 不覆盖别人的文件；我们自己重跑时 ownerFile === target，走原地覆盖
  let finalName = target;
  if (ownerFile !== target && existsSync(join(dir, target))) {
    finalName = `${post.date}-${post.slug}-i${issueNumber}.md`;
  }

  const toRemove = ownerFile && ownerFile !== finalName ? ownerFile : null;
  return { finalName, toRemove };
}

/* --------------------------------------------------------------------- git */

function git(args, opts = {}) {
  log('$ git', args.join(' '));
  return execFileSync('git', args, {
    stdio: opts.capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    // capture=true 仅取 stdout（如 git status），stderr 透传保证错误可见
  });
}

function commitAndPush(filePaths, issue) {
  if (DRY_RUN) {
    log(`DRY_RUN=1 — skip git for: ${filePaths.join(', ')}`);
    return;
  }
  // identity：用 GitHub 官方 bot 账号身份，头像与归属在提交历史里可识别
  git(['config', 'user.name', 'github-actions[bot]']);
  git(['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com']);
  git(['add', '--', ...filePaths]); // 对已删除路径同样生效（改名场景的删除也会被暂存）

  // edited 事件重跑但内容没变化时，避免 "nothing to commit" 令工作流误报失败
  const staged = git(['status', '--porcelain', '--', ...filePaths], { capture: true }).toString().trim();
  if (!staged) {
    log('post unchanged — nothing to commit, skip.');
    return;
  }

  git(['commit', '-m', `docs(blog): publish post from issue #${issue.number}`, '-m', `Source: ${issue.html_url}`]);
  git(['push', 'origin', 'HEAD']); // issues 事件检出的是默认分支 main
  // 注意：GITHUB_TOKEN 的 push 不会触发 deploy.yml（见文件头「已知限制」）
}

/* -------------------------------------------------------------------- main */

const issue = await fetchIssue();

if (!(issue.labels ?? []).some((l) => l.name === 'blog')) {
  log(`#${issue.number} has no "blog" label — skipped (workflow filter is the first gate).`);
  process.exit(0);
}

const post = renderPost(issue);
mkdirSync(POSTS_DIR, { recursive: true });

const { finalName, toRemove } = resolveTarget(POSTS_DIR, post, issue.number);
if (toRemove) {
  rmSync(join(POSTS_DIR, toRemove));
  log(`removed stale post for this issue: ${toRemove} (title/slug changed)`);
}
writeFileSync(join(POSTS_DIR, finalName), post.content, 'utf8');
log(`wrote ${POSTS_DIR}/${finalName} (tags: ${post.tags.join(', ')})`);

commitAndPush(toRemove ? [join(POSTS_DIR, toRemove), join(POSTS_DIR, finalName)] : [join(POSTS_DIR, finalName)], issue);
log('done.');
