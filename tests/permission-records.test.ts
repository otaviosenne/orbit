import { describe, expect, it } from 'vitest';
import { permissionModeFrom } from '../src/core/chat-settings/permission-records';
import type { TranscriptRecord } from '../src/core/transcript-record';

describe('permissionModeFrom', () => {
  it('takes the latest mode the chat logged, skipping agents and unknown values', () => {
    const records: TranscriptRecord[] = [
      { type: 'permission-mode', permissionMode: 'bypassPermissions' },
      { type: 'user', permissionMode: 'plan' },
      { type: 'user', permissionMode: 'acceptEdits', isSidechain: true },
      { type: 'permission-mode', permissionMode: 'someFutureMode' },
    ];
    expect(permissionModeFrom(records)).toBe('plan');
  });

  it('knows nothing when no record carries a mode', () => {
    expect(permissionModeFrom([{ type: 'assistant' }])).toBeNull();
  });
});
