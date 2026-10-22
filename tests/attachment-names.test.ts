import { describe, expect, it } from 'vitest';
import { sanitizedFileName, taggedFileName } from '../src/main/attachment-names';

describe('sanitizedFileName', () => {
  it('keeps a plain name and its extension', () => {
    expect(sanitizedFileName('report-2026.pdf')).toBe('report-2026.pdf');
    expect(sanitizedFileName('Clip.MOV')).toBe('Clip.mov');
  });

  it('makes one safe word of spaces, accents, underscores and symbols', () => {
    expect(sanitizedFileName('Relatório final (v2)_ok*.pdf')).toBe('Relatorio-final-v2-ok.pdf');
  });

  it('drops folders and never makes a hidden or parent name', () => {
    expect(sanitizedFileName('../../etc/passwd')).toBe('passwd');
    expect(sanitizedFileName('C:\\Users\\x\\a b.txt')).toBe('a-b.txt');
    expect(sanitizedFileName('.bashrc')).toBe('bashrc');
    expect(sanitizedFileName('..pdf')).toBe('file.pdf');
    expect(sanitizedFileName('')).toBe('file');
  });

  it('caps a very long name', () => {
    expect(sanitizedFileName(`${'a'.repeat(300)}.pdf`)).toBe(`${'a'.repeat(80)}.pdf`);
  });
});

describe('taggedFileName', () => {
  it('puts the tag before the extension', () => {
    expect(taggedFileName('report.pdf', 'a1b2c3')).toBe('report-a1b2c3.pdf');
    expect(taggedFileName('notes', 'ff')).toBe('notes-ff');
  });
});
