import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { CLAUDE_DIR } from './config';

const CREDENTIALS_PATH: string = join(CLAUDE_DIR, '.credentials.json');

interface Credentials {
  readonly claudeAiOauth?: { readonly accessToken?: string };
}

// Reuses the token Claude Code keeps fresh and never refreshes it, so Claude Code's own login is never invalidated.
export async function readAccessToken(): Promise<string> {
  const credentials: Credentials = JSON.parse(await readFile(CREDENTIALS_PATH, 'utf8')) as Credentials;
  const token: string | undefined = credentials.claudeAiOauth?.accessToken;
  if (token === undefined) throw new Error('No Claude Code login found');
  return token;
}
