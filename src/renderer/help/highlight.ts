import { element } from '../dom';
import type { TextRange } from './text-search';
import { matchRanges } from './text-search';

// The text as nodes, with every match of the search wrapped in <mark>; plain text nodes only, never markup.
export function highlighted(text: string, terms: readonly string[]): readonly Node[] {
  const nodes: Node[] = [];
  let cursor: number = 0;
  for (const range of matchRanges(text, terms)) {
    if (range.start > cursor) nodes.push(document.createTextNode(text.slice(cursor, range.start)));
    nodes.push(element('mark', 'help-mark', slice(text, range)));
    cursor = range.end;
  }
  if (cursor < text.length) nodes.push(document.createTextNode(text.slice(cursor)));
  return nodes;
}

function slice(text: string, range: TextRange): string {
  return text.slice(range.start, range.end);
}
