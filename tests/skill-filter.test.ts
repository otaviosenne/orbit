import { describe, expect, it } from 'vitest';
import { filterSkills } from '../src/renderer/sheet/settings/skill-filter';
import type { SkillEntry } from '../src/shared/types';

const skills: SkillEntry[] = [
  { name: 'pdf', description: 'Review code changes in a PDF report', source: 'user' },
  { name: 'code-review', description: 'Review the current diff', source: 'plugin' },
  { name: 'deploy', description: 'Ship it', source: 'project' },
];

describe('filterSkills', () => {
  it('matches every word in the name or description, name matches first', () => {
    expect(filterSkills(skills, 'review').map((skill: SkillEntry) => skill.name)).toEqual(['code-review', 'pdf']);
    expect(filterSkills(skills, 'diff review').map((skill: SkillEntry) => skill.name)).toEqual(['code-review']);
  });

  it('shows everything for an empty search', () => {
    expect(filterSkills(skills, '  ')).toHaveLength(skills.length);
  });
});
