import type { SkillEntry } from '../../../shared/types';

// Every word typed must appear in the name or the description, in any order; name matches come first.
export function filterSkills(skills: readonly SkillEntry[], query: string): SkillEntry[] {
  const words: string[] = query.toLowerCase().split(/\s+/).filter((word: string) => word.length > 0);
  if (words.length === 0) return [...skills];
  const matches: SkillEntry[] = skills.filter((skill: SkillEntry) => {
    const haystack: string = `${skill.name} ${skill.description}`.toLowerCase();
    return words.every((word: string) => haystack.includes(word));
  });
  const inName = (skill: SkillEntry): boolean => words.every((word: string) => skill.name.toLowerCase().includes(word));
  return [...matches.filter(inName), ...matches.filter((skill: SkillEntry) => !inName(skill))];
}
