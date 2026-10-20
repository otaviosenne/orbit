import type { EffortLevel, ModelChoice } from '../../../shared/chat-settings';

// "claude-opus-5-5", "claude-sonnet-4-5-20250929", "claude-opus-5[1m]": family, major, optional minor, date, 1M context.
const MODEL_ID_PATTERN: RegExp = /^claude-([a-z]+)-(\d+)(?:-(\d{1,2}))?(?:-\d{8})?(\[1m\])?$/i;
const LONG_CONTEXT_SUFFIX: string = ' (1M)';

const CHOICE_LABELS: Readonly<Record<ModelChoice, string>> = {
  default: 'Default',
  opus: 'Opus',
  sonnet: 'Sonnet',
  haiku: 'Haiku',
  fable: 'Fable',
};

const EFFORT_LABELS: Readonly<Record<EffortLevel, string>> = {
  auto: 'Auto',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  xhigh: 'X-High',
  max: 'Max',
};

export function choiceLabel(choice: ModelChoice): string {
  return CHOICE_LABELS[choice];
}

export function effortLabel(effort: EffortLevel): string {
  return EFFORT_LABELS[effort];
}

// The name Claude Code's own banner uses ("Opus 5.5"); aliases and display names are already readable.
export function modelLabel(model: string): string {
  const match: RegExpExecArray | null = MODEL_ID_PATTERN.exec(model);
  if (match === null) return CHOICE_LABELS[model as ModelChoice] ?? model;
  const [, family = '', major = '', minor, longContext] = match;
  const version: string = minor === undefined ? major : `${major}.${minor}`;
  return `${capitalize(family)} ${version}${longContext === undefined ? '' : LONG_CONTEXT_SUFFIX}`;
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}
