import { describe, expect, it } from 'vitest';
import { modelChoiceOf } from '../src/shared/chat-settings';
import { modelLabel } from '../src/renderer/sheet/settings/model-label';

describe('modelLabel', () => {
  it('names ids the way Claude Code does', () => {
    expect(modelLabel('claude-opus-5-5')).toBe('Opus 5.5');
    expect(modelLabel('claude-sonnet-4-5-20250929')).toBe('Sonnet 4.5');
    expect(modelLabel('claude-opus-5')).toBe('Opus 5');
    expect(modelLabel('claude-opus-5-5[1m]')).toBe('Opus 5.5 (1M)');
  });

  it('keeps aliases and display names readable', () => {
    expect(modelLabel('sonnet')).toBe('Sonnet');
    expect(modelLabel('default')).toBe('Default');
    expect(modelLabel('Fable 5.1')).toBe('Fable 5.1');
  });
});

describe('modelChoiceOf', () => {
  it('maps ids, aliases and display names to the same choice', () => {
    expect(modelChoiceOf('claude-sonnet-5-5')).toBe('sonnet');
    expect(modelChoiceOf('Sonnet 5.5')).toBe('sonnet');
    expect(modelChoiceOf('default')).toBe('default');
    expect(modelChoiceOf('opusplan')).toBe('opus');
    expect(modelChoiceOf('gpt-5')).toBeNull();
  });
});
