import DOMPurify from 'dompurify';
import { marked } from 'marked';

// Chat text is untrusted: it is parsed as markdown and sanitized before it ever becomes markup.
export function renderMarkdown(target: HTMLElement, text: string): void {
  const html: string = marked.parse(text, { gfm: true, breaks: true, async: false });
  target.innerHTML = DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}
