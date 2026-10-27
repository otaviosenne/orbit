import { describe, expect, it } from 'vitest';
import { buildResumeCommand } from '../src/main/resume-command';
import { CUT_MESSAGE } from '../src/shared/pause-messages';

describe('buildResumeCommand', () => {
  it('stays the restore script command without a prompt', () => {
    expect(buildResumeCommand('/code/acme', 'abc')).toBe("kitty --directory '/code/acme' claude --resume 'abc'");
  });

  it('hands the prompt over as one quoted word', () => {
    expect(buildResumeCommand('/code/acme', 'abc', CUT_MESSAGE)).toBe(`kitty --directory '/code/acme' claude --resume 'abc' '${CUT_MESSAGE}'`);
  });
});
