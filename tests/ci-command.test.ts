import { describe, expect, it } from 'vitest';
import { isCiCommand } from '../src/core/ci/ci-command';

const WRAPPED_LOOP: string = "source snap.sh && eval 'until s=$(gh run view 123 --json status -q .status); [ \"$s\" = completed ]; do sleep 20; done'";

describe('isCiCommand', () => {
  it('counts CI scripts, the local CI and its wrappers', () => {
    expect(isCiCommand(['bash', 'scripts/ci/local-ci.sh', '--integration'])).toBe(true);
    expect(isCiCommand(['bash', '/tmp/x/scratchpad/run-ci-queue.sh', '/wt/a'])).toBe(true);
    expect(isCiCommand(['/repo/scripts/ci.sh'])).toBe(true);
  });

  it('counts GitHub CI watched from the terminal', () => {
    expect(isCiCommand(['gh', 'run', 'watch', '40404368632', '--exit-status'])).toBe(true);
    expect(isCiCommand(['/usr/bin/gh', 'pr', 'checks', '160', '--watch'])).toBe(true);
    expect(isCiCommand(['/bin/bash', '-c', WRAPPED_LOOP])).toBe(true);
  });

  it('leaves out commands that only read about CI', () => {
    expect(isCiCommand(['cat', 'scripts/ci/local-ci.sh'])).toBe(false);
    expect(isCiCommand(['gh', 'pr', 'checks', '160'])).toBe(false);
    expect(isCiCommand(['gh', 'run', 'view', '123', '--log'])).toBe(false);
    expect(isCiCommand(['/bin/bash', '-c', 'gh run list --limit 1'])).toBe(false);
    expect(isCiCommand(['bash', 'circle.sh'])).toBe(false);
    expect(isCiCommand([])).toBe(false);
  });
});
