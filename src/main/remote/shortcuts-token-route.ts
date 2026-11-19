import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ShortcutsToken } from '../../shared/remote-settings';
import { sendError, sendJson } from './http-io';
import type { RemoteContext } from './remote-context';
import { isSignedIn } from './sign-in';

// POST /api/shortcuts-token, from a signed-in browser: a fresh credential for the iPhone's clipboard Shortcuts. Like a
// pairing code, only a device already in may make one; unlike the access token it reaches the clipboard alone.
export function handleShortcutsToken(request: IncomingMessage, response: ServerResponse, context: RemoteContext): void {
  if (request.method !== 'POST') return sendError(response, 405, 'Method not allowed');
  if (!isSignedIn(request, context.credentials(), context.now())) return sendError(response, 401, 'Sign in first');
  const { cookieValue } = context.credentials().devices.replaceShortcuts(context.now());
  const answer: ShortcutsToken = { token: cookieValue };
  sendJson(response, 200, JSON.stringify(answer));
}
