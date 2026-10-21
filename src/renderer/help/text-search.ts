// A stretch of the original text that matched, as [start, end) offsets into it.
export interface TextRange {
  readonly start: number;
  readonly end: number;
}

// Text folded for matching, with where each folded character came from in the original.
interface FoldedText {
  readonly text: string;
  readonly origins: readonly number[];
}

const COMBINING_MARKS: RegExp = /\p{M}/gu;
const WHITESPACE: RegExp = /\s+/;

// "Configurações" → "configuracoes": accents and case never decide a match.
export function foldText(text: string): string {
  return foldWithOrigins(text).text;
}

// Folded one character at a time, so a match in the folded text maps back onto the original for highlighting.
function foldWithOrigins(text: string): FoldedText {
  let folded: string = '';
  const origins: number[] = [];
  let offset: number = 0;
  for (const character of text) {
    const piece: string = character.normalize('NFD').replace(COMBINING_MARKS, '').toLowerCase();
    folded += piece;
    for (let index: number = 0; index < piece.length; index += 1) origins.push(offset);
    offset += character.length;
  }
  origins.push(offset);
  return { text: folded, origins };
}

// The words of a query, folded; an empty query has none.
export function queryTerms(query: string): readonly string[] {
  return foldText(query).split(WHITESPACE).filter((term: string) => term.length > 0);
}

// Matches when every word of the query appears somewhere among the fields.
export function matchesAllTerms(terms: readonly string[], fields: readonly string[]): boolean {
  const folded: readonly string[] = fields.map(foldText);
  return terms.every((term: string) => folded.some((field: string) => field.includes(term)));
}

// Every place any of the terms appears in the text, merged where they touch or overlap.
export function matchRanges(text: string, terms: readonly string[]): readonly TextRange[] {
  const folded: FoldedText = foldWithOrigins(text);
  const ranges: TextRange[] = terms.flatMap((term: string) => occurrences(folded, term));
  return mergeRanges(ranges);
}

function occurrences(folded: FoldedText, term: string): TextRange[] {
  const found: TextRange[] = [];
  let index: number = folded.text.indexOf(term);
  while (index !== -1) {
    found.push({ start: folded.origins[index] ?? 0, end: folded.origins[index + term.length] ?? 0 });
    index = folded.text.indexOf(term, index + term.length);
  }
  return found;
}

function mergeRanges(ranges: readonly TextRange[]): readonly TextRange[] {
  const sorted: TextRange[] = [...ranges].sort((a: TextRange, b: TextRange) => a.start - b.start);
  return sorted.reduce<TextRange[]>((merged: TextRange[], range: TextRange) => {
    const last: TextRange | undefined = merged.at(-1);
    if (last !== undefined && range.start <= last.end) merged[merged.length - 1] = { start: last.start, end: Math.max(last.end, range.end) };
    else merged.push(range);
    return merged;
  }, []);
}
