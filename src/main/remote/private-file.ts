import { chmod, mkdir, writeFile } from 'node:fs/promises';

// Orbit Web's files are as good as a shell on this machine, so only their owner may read a file or list the folder.
const FILE_MODE: number = 0o600;
const DIR_MODE: number = 0o700;

// mode only applies when a file or folder is created, so existing ones are tightened with chmod as well.
export async function writePrivateFile(dir: string, path: string, text: string): Promise<void> {
  await mkdir(dir, { recursive: true, mode: DIR_MODE });
  await chmod(dir, DIR_MODE);
  await writeFile(path, text, { mode: FILE_MODE });
  await chmod(path, FILE_MODE);
}
