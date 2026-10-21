import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Route } from '../../shared/ipc-routing';
import { isRemoteChannel, remoteAccessOf } from '../../shared/remote-access';
import { REMOTE_API_PREFIX } from '../../shared/remote-settings';
import { decodeWire, encodeWire } from '../../shared/wire-codec';
import { BodyTooLargeError, isJsonRequest, readBody, sendError, sendJson } from './http-io';
import { isOpenChatPid } from './open-chat-guard';
import type { RemoteContext } from './remote-context';
import { isSignedIn } from './sign-in';

// POST /api/call/<Channel> with the channel's arguments as a JSON array; answers with the route's result.
export async function handleApiCall(request: IncomingMessage, response: ServerResponse, path: string, context: RemoteContext): Promise<void> {
  if (request.method !== 'POST') return sendError(response, 405, 'Method not allowed');
  if (!isSignedIn(request, context.credentials())) return sendError(response, 401, 'Sign in first');
  const channel: string = path.slice(REMOTE_API_PREFIX.length);
  // Desktop-only and unknown channels look the same from outside.
  if (!isRemoteChannel(channel)) return sendError(response, 404, 'Unknown call');
  if (!isJsonRequest(request)) return sendError(response, 415, 'Expected JSON');
  const args: unknown[] | null = await readArguments(request, response);
  if (args === null) return;
  if (remoteAccessOf(channel) === 'chat' && !(await isOpenChatPid(context.routes, args[0]))) {
    return sendError(response, 403, 'Not an open chat');
  }
  const route: Route = context.routes[channel];
  // void routes answer null, which is what JSON can carry.
  sendJson(response, 200, encodeWire((await route(...args)) ?? null));
}

async function readArguments(request: IncomingMessage, response: ServerResponse): Promise<unknown[] | null> {
  try {
    const args: unknown = decodeWire(await readBody(request));
    if (Array.isArray(args)) return args;
    sendError(response, 400, 'Arguments must be a JSON array');
  } catch (error: unknown) {
    if (error instanceof BodyTooLargeError) sendError(response, 413, error.message);
    else sendError(response, 400, 'Malformed arguments');
  }
  return null;
}
