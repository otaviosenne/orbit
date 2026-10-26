import type { ActionResult, AttachmentUpload } from '../shared/types';
import { DESKTOP_ATTACHMENTS_LIMIT_BYTES, formatMegabytes } from '../shared/attachment-limits';
import type { PlacedMessage } from './attachment-placement';
import { placeAttachments } from './attachment-placement';
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

// Opens Claude Code's own /mcp menu in the chat; connecting and reconnecting happen there, where the OAuth flow lives.
export function openChatMcp(pid: number): Promise<ActionResult> {
  return submitToChat(pid, '/mcp', 'command');
}

export function setChatEffort(pid: number, effort: unknown): Promise<ActionResult> {
  return submitIfValid(pid, effortCommand(effort), 'command', `Unknown effort: ${String(effort)}`);
}

// A message may be only attachments; the text is optional when something is attached.
export async function sendMessage(pid: number, text: string, uploads: readonly AttachmentUpload[]): Promise<ActionResult> {
  const body: string | null = messageText(text);
  if (body === null && uploads.length === 0) return failure('Message is empty');
  if (totalBytes(uploads) > DESKTOP_ATTACHMENTS_LIMIT_BYTES) return failure(`Attachments over ${formatMegabytes(DESKTOP_ATTACHMENTS_LIMIT_BYTES)}`);
  const placed: PlacedMessage = placeAttachments(body ?? '', await saveAttachments(uploads));
  return submitToChat(pid, placed.text, 'message', placed.imagePaths);
}

function totalBytes(uploads: readonly AttachmentUpload[]): number {
  return uploads.reduce((sum: number, upload: AttachmentUpload) => sum + upload.bytes.byteLength, 0);
}

function submitIfValid(pid: number, text: string | null, kind: InputKind, invalidReason: string): Promise<ActionResult> {
  return text === null ? Promise.resolve(failure(invalidReason)) : submitToChat(pid, text, kind);
}
