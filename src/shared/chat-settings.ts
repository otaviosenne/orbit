// The /model aliases Orbit offers. Claude Code also takes full ids and [1m] variants; those are left to the terminal.
export const MODEL_CHOICES = ['default', 'opus', 'sonnet', 'haiku', 'fable'] as const;
export type ModelChoice = (typeof MODEL_CHOICES)[number];

// What `/effort` accepts in Claude Code 2.1.x; 'auto' hands the level back to the model's default.
export const EFFORT_LEVELS = ['auto', 'low', 'medium', 'high', 'xhigh', 'max'] as const;
export type EffortLevel = (typeof EFFORT_LEVELS)[number];

// Claude Code never saves this level as a default, so it lasts only for the chat it was set in.
export const SESSION_ONLY_EFFORT: EffortLevel = 'max';

const MODEL_FAMILIES: readonly ModelChoice[] = MODEL_CHOICES.filter((choice: ModelChoice) => choice !== 'default');

export function isModelChoice(value: unknown): value is ModelChoice {
  return typeof value === 'string' && (MODEL_CHOICES as readonly string[]).includes(value);
}

export function isEffortLevel(value: unknown): value is EffortLevel {
  return typeof value === 'string' && (EFFORT_LEVELS as readonly string[]).includes(value);
}

// Maps an alias, a full id ("claude-opus-5-5") or a display name ("Sonnet 5.5") to the choice it belongs to,
// so a value typed in the terminal and one picked in Orbit compare equal.
export function modelChoiceOf(model: string): ModelChoice | null {
  const lower: string = model.toLowerCase();
  if (lower === 'default') return 'default';
  return MODEL_FAMILIES.find((family: ModelChoice) => lower.includes(family)) ?? null;
}
