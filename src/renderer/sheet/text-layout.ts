// What decides where a textarea's glyphs land; a copy with the same values lays its text out identically.
export const TEXT_LAYOUT_PROPERTIES: readonly string[] = [
  'box-sizing', 'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'font-family', 'font-size', 'font-weight',
  'font-style', 'font-feature-settings', 'font-variation-settings', 'line-height', 'letter-spacing', 'word-spacing',
  'text-indent', 'tab-size',
];

export function copyTextLayout(source: CSSStyleDeclaration, target: HTMLElement, properties: readonly string[] = TEXT_LAYOUT_PROPERTIES): void {
  for (const property of properties) target.style.setProperty(property, source.getPropertyValue(property));
}
