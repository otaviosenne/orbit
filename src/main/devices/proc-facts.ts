import { readFile, readlink } from 'node:fs/promises';
import type { ProcessFacts } from '../../core/devices/metro-port';
import { parseProcessSample } from '../../core/resources/process-sample';

const PROC: string = '/proc';
const ARG_SEPARATOR: string = '\0';

// A process that exited meanwhile, or one run by another user, simply has no facts.
export const procFacts: ProcessFacts = {
  argv: async (pid: number): Promise<readonly string[]> =>
    (await readFile(`${PROC}/${pid}/cmdline`, 'utf8').catch((): string => '')).split(ARG_SEPARATOR).filter((arg: string) => arg.length > 0),
  parentPid: async (pid: number): Promise<number | null> => {
    const stat: string | null = await readFile(`${PROC}/${pid}/stat`, 'utf8').catch((): null => null);
    return stat === null ? null : (parseProcessSample(pid, stat)?.parentPid ?? null);
  },
  cwd: (pid: number): Promise<string | null> => readlink(`${PROC}/${pid}/cwd`).catch((): null => null),
};
