import { describe, expect, it } from 'vitest';
import { buildResumeCommand } from '../src/main/resume-command';

describe('buildResumeCommand', () => {
  it('stays the restore script command, with no prompt (an interactive resume ignores one)', () => {
    expect(buildResumeCommand('/code/acme', 'abc')).toBe("kitty --directory '/code/acme' claude --resume 'abc'");
  });
});
