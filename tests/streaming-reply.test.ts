import { describe, expect, it } from 'vitest';
import { parseStreamingReply } from '../src/main/streaming/streaming-parser';
import { isAlreadyWritten } from '../src/shared/written-check';
import type { MessageItem, TranscriptItem } from '../src/shared/types';

const RULE: string = '─'.repeat(60);
const COMPOSER: string[] = [RULE, '❯ ', RULE, '  ⏵⏵ bypass permissions on (shift+tab to cycle) · esc to interrupt'];

// Shaped after captures of Claude Code 2.1.318 writing an essay (`kitty @ get-text --extent all`), in a 60-column window.
const WRITING: string = [
  '❯ Write an essay about bridges, with a bullet list.',
  '',
  '● Spanning the Gap',
  '',
  '  The earliest bridges were not built at all. A tree fallen',
  '  across a stream gave early humans a way across water.',
  '',
  '  Five famous bridges:',
  '',
  '  - Pont du Gard, France: a Roman aqueduct bridge from the',
  '    first century CE.',
  '  - Anji Bridge, China: the oldest surviving segmental arch',
  '',
  ...COMPOSER,
].join('\n');

const AFTER_TOOL: string = [
  '● Looking at the file first.',
  '',
  '● Bash(npm test)',
  '  ⎿  Running…',
  '',
  '✻ Crystallizing… (12s · ↓ 1.2k tokens)',
  '',
  ...COMPOSER,
].join('\n');

const THINKING: string = ['❯ Write an essay.', '', '✽ Puzzling… (3s · thinking)', ...COMPOSER].join('\n');

describe('the reply being written', () => {
  it('reads the last block off the terminal, rows unwrapped and list items kept apart', () => {
    expect(parseStreamingReply(WRITING)).toBe([
      'Spanning the Gap',
      '',
      'The earliest bridges were not built at all. A tree fallen across a stream gave early humans a way across water.',
      '',
      'Five famous bridges:',
      '',
      '- Pont du Gard, France: a Roman aqueduct bridge from the first century CE.',
      '- Anji Bridge, China: the oldest surviving segmental arch',
    ].join('\n'));
  });

  it('reads nothing while the screen ends with a tool call', () => {
    expect(parseStreamingReply(AFTER_TOOL)).toBeNull();
  });

  it('reads nothing while Claude is still thinking', () => {
    expect(parseStreamingReply(THINKING)).toBeNull();
  });

  it('reads nothing off a screen without a composer', () => {
    expect(parseStreamingReply('● Some text\n  more text')).toBeNull();
  });
});

describe('a draft the transcript already has', () => {
  const message = (role: 'user' | 'assistant', text: string, isQueued: boolean = false): MessageItem => ({
    kind: 'message', id: `${role}-${text.length}`, timestamp: 0, role, text, images: [], isQueued,
  });

  it('is written once the turn holds the same text, markdown aside', () => {
    const items: TranscriptItem[] = [message('user', 'Write an essay'), message('assistant', '## Spanning the Gap\n\nThe **earliest** bridges were not built at all. A tree fallen')];
    expect(isAlreadyWritten('Spanning the Gap\n\nThe earliest bridges were not built at all. A tree fallen across', items)).toBe(true);
  });

  it('is not written while only an earlier reply of the turn, or a reply of an earlier turn, is there', () => {
    const items: TranscriptItem[] = [message('assistant', 'Spanning the Gap is my old essay title, kept in memory here.'), message('user', 'Again'), message('assistant', 'Looking at the file first.')];
    expect(isAlreadyWritten('Spanning the Gap\n\nThe earliest bridges were not built at all.', items)).toBe(false);
  });

  it('ignores a prompt still waiting in the queue when finding where the turn starts', () => {
    const items: TranscriptItem[] = [message('user', 'Write'), message('assistant', 'Spanning the Gap. The earliest bridges were not built at all.'), message('user', 'next', true)];
    expect(isAlreadyWritten('Spanning the Gap\n\nThe earliest bridges were not built at all.', items)).toBe(true);
  });
});
