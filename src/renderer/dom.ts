// Plain text always goes through textContent; markdown goes through renderMarkdown, which sanitizes it.
export function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node: HTMLElementTagNameMap[K] = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function requireElement<T extends HTMLElement>(selector: string): T {
  const node: T | null = document.querySelector<T>(selector);
  if (node === null) throw new Error(`Missing element: ${selector}`);
  return node;
}
