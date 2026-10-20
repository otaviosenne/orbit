import type { ActionResult, AttachmentUpload } from '../shared/types';
import { saveAttachments } from './attachments';
import { colorCommand, effortCommand, messageText, modelCommand, renameCommand } from './chat-command-text';
import { failure, submitToChat } from './terminal-input';
import type { InputKind } from './terminal-input';

export function renameChat(pid: number, name: string): Promise<ActionResult> {
  return submitIfValid(pid, renameCommand(name), 'command', 'Name is empty');
}

export function recolorChat(pid: number, color: string): Promise<ActionResult> {
  return submitIfValid(pid, colorCommand(color), 'command', `Unknown color: ${color}`);
}

export function setChatModel(pid: number, model: unknown): Promise<ActionResult> {
  return submitIfValid(pid, modelCommand(model), 'command', `Unknown model: ${String(model)}`);
}

export function setChatEffort(pid: number, effort: unknown): Promise<ActionResult> {
  return submitIfValid(pid, effortCommand(effort), 'command', `Unknown effort: ${String(effort)}`);
}

// A message may be only images; the text is optional when something is attached.
export async function sendMessage(pid: number, text: string, uploads: readonly AttachmentUpload[]): Promise<ActionResult> {
  const body: string | null = messageText(text);
  if (body === null && uploads.length === 0) return failure('Message is empty');
  return submitToChat(pid, body ?? '', 'message', await saveAttachments(uploads));
}

function submitIfValid(pid: number, text: string | null, kind: InputKind, invalidReason: string): Promise<ActionResult> {
  return text === null ? Promise.resolve(failure(invalidReason)) : submitToChat(pid, text, kind);
}
