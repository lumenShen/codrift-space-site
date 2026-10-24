/*
 * frontmatter 解析 —— 仅支持内容条目实际用到的 YAML 子集（契约 §2.3：不引入额外依赖）。
 * 支持：
 *   --- 包裹的文件头；`key: value`；
 *   行内数组 `tags: [a, b]`；块序列 `tags:` + `  - a`；
 *   值两端的成对引号会剥掉；日期等一律按字符串保留。
 */

export interface Frontmatter {
  data: Record<string, string | string[]>;
  body: string;
}

function unquote(value: string): string {
  const v = value.trim();
  if (v.length >= 2 && ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))) {
    return v.slice(1, -1);
  }
  return v;
}

function parseInlineArray(raw: string): string[] | null {
  const v = raw.trim();
  if (!v.startsWith('[') || !v.endsWith(']')) return null;
  const inner = v.slice(1, -1).trim();
  if (inner === '') return [];
  return inner.split(',').map((item) => unquote(item));
}

/** 解析文件头（若存在）。body 为去掉 frontmatter 后的原文（保留其余内容原样）。 */
export function parseFrontmatter(raw: string): Frontmatter {
  const normalized = raw.replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---')) return { data: {}, body: raw };

  const lines = normalized.split('\n');
  // 第 0 行是开栏 `---`，找下一个只含 `---` 的行作为闭栏。
  let closeIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trimEnd() === '---') {
      closeIndex = i;
      break;
    }
  }
  if (closeIndex === -1) return { data: {}, body: raw };

  const data: Record<string, string | string[]> = {};
  let currentListKey: string | null = null;
  for (let i = 1; i < closeIndex; i++) {
    const line = lines[i];
    const listMatch = /^\s*-\s*(.*)$/.exec(line);
    if (currentListKey !== null && listMatch) {
      const list = data[currentListKey];
      if (Array.isArray(list)) list.push(unquote(listMatch[1]));
      continue;
    }
    const kvMatch = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(line);
    if (!kvMatch) continue;
    const key = kvMatch[1];
    const valueRaw = kvMatch[2].trim();
    currentListKey = null;
    if (valueRaw === '') {
      // 可能为块序列开头，先按空数组挂上，等后续 `- ` 行填充
      data[key] = [];
      currentListKey = key;
      continue;
    }
    const inlineArray = parseInlineArray(valueRaw);
    data[key] = inlineArray !== null ? inlineArray : unquote(valueRaw);
  }

  // 块序列后没有实际填充且为空数组 → 保留为空（title/tags 校验会拦截）
  const bodyLines = lines.slice(closeIndex + 1);
  return { data, body: bodyLines.join('\n') };
}
