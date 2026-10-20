import { describe, expect, it } from 'vitest';
import { parseProcessStat } from '../src/core/process-identity';

describe('parseProcessStat', () => {
  it('reads parent pid and start time even when the command name has spaces', () => {
    const raw: string = '5892 (claude (main)) S 5785 5892 5785 0 -1 4194304 1 2 3 4 5 6 7 8 20 0 11 0 3491 1000 2';
    expect(parseProcessStat(raw)).toEqual({ parentPid: 5785, startTime: '3491' });
  });
});
