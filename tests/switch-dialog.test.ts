import { describe, expect, it } from 'vitest';
import { parseSwitchDialog } from '../src/main/chat-settings/switch-dialog';

// Captured from Claude Code 2.1.312 after `/model sonnet` in a chat with a warm cache.
const MODEL_DIALOG: string = `❯ /model sonnet
──────────────────────────────────────────────── model-probe ─

──────────────────────────────────────────────────────────────
  Switch model?
  Your next response will be slower and use more tokens

  This conversation is cached for the current model. Switching to Sonnet 5.5 means the full
  history gets re-read.

  ❯ 1. Yes, switch to Sonnet 5.5
    2. No, go back`;

describe('parseSwitchDialog', () => {
  it('reads the title, the explanation and the confirm option of the model dialog', () => {
    expect(parseSwitchDialog(MODEL_DIALOG)).toEqual({
      title: 'Switch model?',
      detail: 'Your next response will be slower and use more tokens\nThis conversation is cached for the current model. Switching to Sonnet 5.5 means the full history gets re-read.',
      confirmLabel: 'Yes, switch to Sonnet 5.5',
    });
  });

  it('reads the effort dialog by its own title', () => {
    const screen: string = MODEL_DIALOG.replace('Switch model?', 'Change effort level?');
    expect(parseSwitchDialog(screen)?.title).toBe('Change effort level?');
  });

  it('finds nothing on a screen without the dialog', () => {
    expect(parseSwitchDialog('❯ /model sonnet\n  ⎿  Set model to Sonnet 5.5')).toBeNull();
  });
});
