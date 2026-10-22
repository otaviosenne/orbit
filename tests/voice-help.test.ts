import { describe, expect, it } from 'vitest';
import { VOICE_HELP, matchingVoiceCommands } from '../src/renderer/help/voice-help';
import { foldText } from '../src/renderer/help/text-search';
import { PHRASE_RULES } from '../src/renderer/sheet/voice/commands/phrase-table';

const spoken: Set<string> = new Set(VOICE_HELP.flatMap((entry) => entry.says.map((phrase: string) => foldText(phrase))));

describe('the Voice tab', () => {
  it('lists the first way to say every command in the command table', () => {
    for (const rule of PHRASE_RULES) {
      const first: string = rule.phrases[0]?.join(' ') ?? '';
      expect(spoken.has(foldText(first)), `"${first}" is missing from the Voice tab`).toBe(true);
    }
  });

  it('finds a command by what it does, what to say or its group', () => {
    expect(matchingVoiceCommands(VOICE_HELP, ['emulador']).map((entry) => entry.group)).toEqual(['Devices']);
    expect(matchingVoiceCommands(VOICE_HELP, ['send']).length).toBeGreaterThan(0);
    expect(matchingVoiceCommands(VOICE_HELP, ['views']).length).toBe(5);
  });
});
