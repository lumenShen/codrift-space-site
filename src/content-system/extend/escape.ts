/** HTML 文本转义（内容文本进入自产 HTML 时使用；契约规定内容可信，不额外 sanitize marked 输出） */

const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch] ?? ch);
}
