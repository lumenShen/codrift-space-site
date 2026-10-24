/*
 * 代码感知的文本扫描工具。
 * 扩展语法转换器必须跳过代码区域（围栏代码块、行内代码），否则
 * 文档里演示语法本身的代码示例会被误转换。
 */

/**
 * 把源码切分为「围栏代码段」与「文本段」，只对文本段执行 replaceText。
 * 围栏识别：行首（≤3 空格缩进）的 ``` 或 ~~~ 开合，闭合栏长度不小于开栏。
 */
export function mapOutsideFences(src: string, replaceText: (text: string) => string): string {
  const lines = src.split('\n');
  const out: string[] = [];
  let textBuffer: string[] = [];
  let fenceChar: '`' | '~' | null = null;
  let fenceLen = 0;

  const flushText = () => {
    if (textBuffer.length > 0) {
      out.push(replaceText(textBuffer.join('\n')));
      textBuffer = [];
    }
  };

  for (const line of lines) {
    if (fenceChar === null) {
      const openMatch = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
      if (openMatch) {
        flushText();
        out.push(line);
        const marker = openMatch[1];
        fenceChar = marker.charAt(0) === '~' ? '~' : '`';
        fenceLen = marker.length;
        continue;
      }
      textBuffer.push(line);
      continue;
    }
    // 处于围栏内：原样保留，检测闭合栏
    out.push(line);
    const closePattern = new RegExp(`^\\s{0,3}\\${fenceChar}{${fenceLen},}\\s*$`);
    if (closePattern.test(line)) fenceChar = null;
  }
  flushText();
  return out.join('\n');
}

/**
 * 在文本段内按行处理：行内代码（反引号包裹）保持原样，其余部分执行 replacePart。
 * 限定单行内配对，避免未闭合的反引号把后续段落吞进代码段。
 */
export function mapOutsideInlineCode(text: string, replacePart: (part: string) => string): string {
  return text
    .split('\n')
    .map((line) => {
      if (!line.includes('`')) return replacePart(line);
      const parts = line.split(/(`+[^`]*`+)/g);
      return parts
        .map((part, index) => (index % 2 === 1 ? part : replacePart(part)))
        .join('');
    })
    .join('\n');
}
