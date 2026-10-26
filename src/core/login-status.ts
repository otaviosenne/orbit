import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { LoginState } from '../shared/types';
import { CLAUDE_DIR } from './config';

const CREDENTIALS_PATH: string = join(CLAUDE_DIR, '.credentials.json');

interface StoredLogin {
  readonly claudeAiOauth?: { readonly accessToken?: string; readonly refreshToken?: string; readonly refreshTokenExpiresAt?: number };
}

// Signed out when there is no login, or when it can no longer be renewed. An access token past its own expiry is not
// signed out: Claude Code renews it on its next request. Read-only, so Claude Code's login is never disturbed.
export function loginStateOf(stored: StoredLogin | null, now: number): LoginState {
  const oauth: StoredLogin['claudeAiOauth'] = stored?.claudeAiOauth;
  if (oauth?.accessToken === undefined || oauth.accessToken.length === 0) return 'signed-out';
  if (oauth.refreshTokenExpiresAt !== undefined && oauth.refreshTokenExpiresAt <= now) return 'signed-out';
  return 'signed-in';
}

export async function readLoginState(now: number): Promise<LoginState> {
  try {
    return loginStateOf(JSON.parse(await readFile(CREDENTIALS_PATH, 'utf8')) as StoredLogin, now);
  } catch {
    return 'signed-out';
  }
}
