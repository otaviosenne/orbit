import { describe, expect, it } from 'vitest';
import { chatSettingsFrom } from '../src/core/chat-settings/settings-records';
import type { TranscriptRecord } from '../src/core/transcript-record';

function reply(model: string, effort: string, isSidechain: boolean = false): TranscriptRecord {
  return { type: 'assistant', isSidechain, effort, message: { model, role: 'assistant', content: [] } };
}

function user(content: string): TranscriptRecord {
  return { type: 'user', message: { role: 'user', content } };
}

function command(name: string, args: string, output: string): TranscriptRecord[] {
  return [
    user(`<command-name>/${name}</command-name>\n            <command-message>${name}</command-message>\n            <command-args>${args}</command-args>`),
    user(`<local-command-stdout>${output}</local-command-stdout>`),
  ];
}

describe('chatSettingsFrom', () => {
  it('reads the latest reply and ignores agents and placeholder replies', () => {
    const records: TranscriptRecord[] = [reply('claude-opus-5-5', 'high'), reply('claude-haiku-5-5', 'low', true), reply('<synthetic>', 'x')];
    expect(chatSettingsFrom(records)).toEqual({ model: 'claude-opus-5-5', effort: 'high' });
  });

  it('lets a later /model or /effort that succeeded override the last reply', () => {
    const records: TranscriptRecord[] = [
      reply('claude-opus-5-5', 'high'),
      ...command('effort', 'medium', 'Set effort level to medium (saved as your default for new sessions): Balanced'),
      ...command('model', 'sonnet', 'Set model to `Sonnet 5.5` and saved as your default for new sessions'),
    ];
    expect(chatSettingsFrom(records)).toEqual({ model: 'sonnet', effort: 'medium' });
  });

  it('keeps the old value when the command failed, and takes the capped level when one was applied', () => {
    const records: TranscriptRecord[] = [
      reply('claude-haiku-5-5', 'low'),
      ...command('model', 'nonsense', "Model 'nonsense' not found"),
      ...command('effort', 'max', "Effort 'max' exceeds the cap for haiku set by your settings or organization; set to 'high' instead (this session only): x"),
    ];
    expect(chatSettingsFrom(records)).toEqual({ model: 'claude-haiku-5-5', effort: 'high' });
  });

  it('reads auto effort and a model picked in the picker, which has no argument', () => {
    const records: TranscriptRecord[] = [
      ...command('effort', 'auto', 'Effort level set to auto'),
      ...command('model', '', 'Set model to `Fable 5.1` for this session only'),
    ];
    expect(chatSettingsFrom(records)).toEqual({ model: 'Fable 5.1', effort: 'auto' });
  });

  it('knows nothing before the first reply', () => {
    expect(chatSettingsFrom([user('hello')])).toEqual({ model: null, effort: null });
  });
});
