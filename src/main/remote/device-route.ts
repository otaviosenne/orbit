import type { IncomingMessage, ServerResponse } from 'node:http';
import type { RemoteDevice } from '../../shared/remote-settings';
import { sendError, sendJson } from './http-io';
import type { RemoteContext } from './remote-context';
import { sessionDevice } from './sign-in';

// GET /api/device: the device this browser is signed in as, so Orbit Web can say which one it is.
export function handleDevice(request: IncomingMessage, response: ServerResponse, context: RemoteContext): void {
  if (request.method !== 'GET') return sendError(response, 405, 'Method not allowed');
  const device: RemoteDevice | null = sessionDevice(request.headers.cookie, context.credentials(), context.now());
  if (device === null) return sendError(response, 401, 'Sign in first');
  sendJson(response, 200, JSON.stringify(device));
}
