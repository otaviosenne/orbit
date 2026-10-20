import { describe, expect, it } from 'vitest';
import { parseFrontmatter } from '../src/core/skills/skill-frontmatter';

describe('parseFrontmatter', () => {
  it('reads plain, quoted and folded values', () => {
    const fields = parseFrontmatter(
      ['---', 'name: ponytail', 'description: >', '  Lazy senior dev mode:', '  the smallest change.', "argument-hint: '[level]'", 'user-invocable: false', '---', '# Body', 'name: not-a-field'].join('\n'),
    );
    expect(fields.get('name')).toBe('ponytail');
    expect(fields.get('description')).toBe('Lazy senior dev mode: the smallest change.');
    expect(fields.get('argument-hint')).toBe('[level]');
    expect(fields.get('user-invocable')).toBe('false');
    expect(fields.size).toBe(4);
  });

  it('joins a plain value continued on indented lines', () => {
    expect(parseFrontmatter('---\ndescription: one\n  two\n---').get('description')).toBe('one two');
  });

  it('returns nothing for a file without a header', () => {
    expect(parseFrontmatter('# Title\nname: x').size).toBe(0);
  });
});
