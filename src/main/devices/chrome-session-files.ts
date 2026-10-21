import type { Dirent } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { ChromeSession } from '../../core/devices/chrome-session';
import { parseChromeSession } from '../../core/devices/chrome-session';
import type { SessionTabPlace } from '../../core/devices/session-tab-plan';
import { findSessionTab } from '../../core/devices/session-tab-plan';
import { chromeUserDataDir } from '../../core/devices/chrome-user-data';

const SESSIONS_FOLDER: string = 'Sessions';
const SESSION_FILE_PREFIX: string = 'Session_';
const NUL: string = '\0';

interface SessionFile {
  readonly path: string;
  readonly modifiedAt: number;
}

export interface SessionTabFound {
  readonly session: ChromeSession;
  readonly place: SessionTabPlace;
}

// The profile folder this Chrome process reads and writes; the session files and Local State live there.
export async function userDataDirOf(pid: number, className: string): Promise<string> {
  const args: string[] = await readFile(`/proc/${pid}/cmdline`, 'utf8').then((text: string) => text.split(NUL), (): string[] => []);
  return chromeUserDataDir(args, className, process.env['XDG_CONFIG_HOME'] ?? join(homedir(), '.config'));
}

// Read on click only and kept in the main process: the file lists every page the user has open.
// Files last written before this Chrome started belong to an earlier run, whose tab ids are gone.
export async function findTabInSessions(userDataDir: string, tabId: number, chromeStartedAt: number | null): Promise<SessionTabFound | null> {
  const files: SessionFile[] = (await sessionFiles(userDataDir)).filter((file: SessionFile) => chromeStartedAt === null || file.modifiedAt >= chromeStartedAt);
  for (const file of files.sort((left: SessionFile, right: SessionFile) => right.modifiedAt - left.modifiedAt)) {
    const session: ChromeSession | null = await readSession(file.path);
    const place: SessionTabPlace | null = session === null ? null : findSessionTab(session, tabId);
    if (session !== null && place !== null) return { session, place };
  }
  return null;
}

// Every profile of the browser has its own Sessions folder, and one Chrome process can run several profiles.
async function sessionFiles(userDataDir: string): Promise<SessionFile[]> {
  const profiles: Dirent[] = await readdir(userDataDir, { withFileTypes: true }).catch((): Dirent[] => []);
  const perProfile: SessionFile[][] = await Promise.all(
    profiles.filter((entry: Dirent) => entry.isDirectory()).map((entry: Dirent) => sessionFilesIn(join(userDataDir, entry.name, SESSIONS_FOLDER))),
  );
  return perProfile.flat();
}

async function sessionFilesIn(folder: string): Promise<SessionFile[]> {
  const names: string[] = await readdir(folder).catch((): string[] => []);
  const files: (SessionFile | null)[] = await Promise.all(
    names.filter((name: string) => name.startsWith(SESSION_FILE_PREFIX)).map((name: string) => sessionFile(join(folder, name))),
  );
  return files.filter((file: SessionFile | null): file is SessionFile => file !== null);
}

async function sessionFile(path: string): Promise<SessionFile | null> {
  return stat(path).then(
    (info): SessionFile => ({ path, modifiedAt: info.mtimeMs }),
    (): null => null,
  );
}

async function readSession(path: string): Promise<ChromeSession | null> {
  return readFile(path).then(
    (bytes: Buffer): ChromeSession => parseChromeSession(bytes),
    (): null => null,
  );
}
