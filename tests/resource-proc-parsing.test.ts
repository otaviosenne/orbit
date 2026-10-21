import { describe, expect, it } from 'vitest';
import { parseProcessSample } from '../src/core/resources/process-sample';
import { parsePssBytes } from '../src/core/resources/pss';

// A real claude stat line, with a command name holding spaces and a ')' of its own.
const STAT: string = '6646 (claude (main)) S 6600 6646 6600 34816 6646 4194304 9120 0 3 0 1234 567 0 0 20 0 11 0 3491 1000 2 18446744073709551615';

describe('parseProcessSample', () => {
  it('reads parent pid, start time and user plus system ticks after the command name', () => {
    expect(parseProcessSample(6646, STAT)).toEqual({ pid: 6646, parentPid: 6600, startTime: '3491', cpuTicks: 1234 + 567 });
  });

  it('rejects a line it cannot read rather than inventing numbers', () => {
    expect(parseProcessSample(1, 'garbage')).toBeNull();
    expect(parseProcessSample(1, '1 (init) S 0 1')).toBeNull();
  });
});

describe('parsePssBytes', () => {
  it('takes the Pss line in kB, not Pss_Anon or Rss', () => {
    const rollup: string = ['Rss:              583976 kB', 'Pss:              446669 kB', 'Pss_Anon:         433808 kB'].join('\n');
    expect(parsePssBytes(rollup)).toBe(446669 * 1024);
  });

  it('is null without a Pss line', () => {
    expect(parsePssBytes('Rss: 10 kB')).toBeNull();
  });
});
