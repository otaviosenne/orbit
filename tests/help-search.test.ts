import { describe, expect, it } from 'vitest';
import { foldText, matchRanges, matchesAllTerms, queryTerms } from '../src/renderer/help/text-search';
import type { TextRange } from '../src/renderer/help/text-search';

function marked(text: string, ranges: readonly TextRange[]): string[] {
  return ranges.map((range: TextRange) => text.slice(range.start, range.end));
}

describe('help search', () => {
  it('folds case and accents', () => {
    expect(foldText('Configurações')).toBe('configuracoes');
    expect(queryTerms('  Pin  CHAT ')).toEqual(['pin', 'chat']);
    expect(queryTerms('   ')).toEqual([]);
  });

  it('needs every word of the query somewhere in the fields', () => {
    expect(matchesAllTerms(queryTerms('close chat'), ['How do I close', 'a chat?'])).toBe(true);
    expect(matchesAllTerms(queryTerms('close agent'), ['How do I close a chat?'])).toBe(false);
    expect(matchesAllTerms([], ['anything'])).toBe(true);
  });

  it('matches accented text and highlights the original characters', () => {
    const text: string = 'Abrir Configurações';
    expect(marked(text, matchRanges(text, queryTerms('COES')))).toEqual(['ções']);
    expect(marked(text, matchRanges(text, queryTerms('configuracoes')))).toEqual(['Configurações']);
  });

  it('marks every occurrence and merges overlapping terms', () => {
    const text: string = 'pin and unpin';
    expect(marked(text, matchRanges(text, ['pin']))).toEqual(['pin', 'pin']);
    expect(marked(text, matchRanges(text, ['unp', 'npin']))).toEqual(['unpin']);
  });
});
