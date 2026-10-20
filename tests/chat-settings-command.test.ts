import { describe, expect, it } from 'vitest';
import { effortCommand, modelCommand } from '../src/main/chat-command-text';

describe('model and effort commands', () => {
  it('builds /model and /effort from known values only', () => {
    expect(modelCommand('sonnet')).toBe('/model sonnet');
    expect(effortCommand('xhigh')).toBe('/effort xhigh');
    expect(modelCommand('sonnet\n/clear')).toBeNull();
    expect(effortCommand(3)).toBeNull();
  });
});
