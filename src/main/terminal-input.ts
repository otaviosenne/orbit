import type { ActionResult, DeliveryMethod } from '../shared/types';
import { typeIntoWindow } from './keyboard-typer';
import { hasKittySocket, submitThroughKitty } from './kitty-remote';
import { findTerminalWindowPid } from './terminal-window';

export type InputKind = 'command' | 'message';

// Submits text to a chat's prompt as if the user typed it there.
// attachments are image paths, pasted where the text's [Image #N] markers are.
export async function submitToChat(chatPid: number, text: string, kind: InputKind, attachments: readonly string[] = []): Promise<ActionResult> {
  const windowPid: number | null = await findTerminalWindowPid(chatPid);
  if (windowPid === null) return failure('Terminal window not found');
  try {
    return success(await deliver(windowPid, text, kind, attachments));
  } catch (error: unknown) {
    return failure(error instanceof Error ? error.message : String(error));
  }
}

async function deliver(windowPid: number, text: string, kind: InputKind, attachments: readonly string[]): Promise<DeliveryMethod> {
  if (await hasKittySocket(windowPid)) {
    await submitThroughKitty(windowPid, text, { asPaste: kind === 'message', attachments });
    return 'socket';
  }
  // Typing cannot paste a file, so images need the window's remote-control socket; other files are only their path.
  if (attachments.length > 0) throw new Error('Images can only be sent to chats reopened with kitty remote control');
  await typeIntoWindow(windowPid, text);
  return 'typed';
}

export function success(method: DeliveryMethod): ActionResult {
  return { ok: true, method, error: null };
}

export function failure(error: string): ActionResult {
  return { ok: false, method: null, error };
}
