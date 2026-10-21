import { describe, expect, it } from 'vitest';
import { cleanOutput } from '../src/core/shells/output-text';
import { isTaskOutputPath } from '../src/core/shells/shell-output';

const SESSION: string = '0a0428ce-d73d-40eb-88e9-2a1668ecaa34';
const REAL_PATH: string = `/tmp/claude-1000/-home-senne-Claude/${SESSION}/tasks/bueikwkij.output`;

describe('isTaskOutputPath', () => {
  it('accepts the path Claude Code names for that session and task', () => {
    expect(isTaskOutputPath(REAL_PATH, SESSION, 'bueikwkij')).toBe(true);
  });

  it('refuses another task, another session, a relative path or one that climbs out', () => {
    expect(isTaskOutputPath(REAL_PATH, SESSION, 'boaqlfcrg')).toBe(false);
    expect(isTaskOutputPath(REAL_PATH, 'other-session', 'bueikwkij')).toBe(false);
    expect(isTaskOutputPath(`tmp/${SESSION}/tasks/bueikwkij.output`, SESSION, 'bueikwkij')).toBe(false);
    expect(isTaskOutputPath(`/home/senne/.ssh/../${SESSION}/tasks/bueikwkij.output`, SESSION, 'bueikwkij')).toBe(false);
    expect(isTaskOutputPath(`/tmp/${SESSION}/notes/bueikwkij.output`, SESSION, 'bueikwkij')).toBe(false);
  });
});

describe('cleanOutput', () => {
  it('drops color codes and terminal titles', () => {
    expect(cleanOutput('\u001b[32mok\u001b[0m done\u001b]0;title\u0007')).toBe('ok done');
  });

  it('keeps only the last draw of a line redrawn with carriage returns', () => {
    expect(cleanOutput('progress 10%\rprogress 50%\rprogress 100%\nnext')).toBe('progress 100%\nnext');
  });

  it('reads Windows line ends as plain ones', () => {
    expect(cleanOutput('line one\r\nline two\r\n')).toBe('line one\nline two\n');
  });
});
