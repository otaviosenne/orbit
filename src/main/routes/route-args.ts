import type { AttachmentUpload, ContinueTarget, PauseTarget } from '../../shared/types';

// A chat is named by its Claude Code process id: always a positive whole number.
export function isPid(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

// A missing or non-text argument reads as empty, which every action already refuses with its own message.
export function textArg(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function isAttachmentList(value: unknown): value is AttachmentUpload[] {
  return Array.isArray(value) && value.every(isAttachment);
}

function isAttachment(value: unknown): value is AttachmentUpload {
  if (typeof value !== 'object' || value === null) return false;
  const candidate: Record<string, unknown> = value as Record<string, unknown>;
  return typeof candidate['name'] === 'string' && typeof candidate['mediaType'] === 'string' && candidate['bytes'] instanceof Uint8Array;
}

export function isContinueTargets(value: unknown): value is ContinueTarget[] {
  return Array.isArray(value) && value.every(isContinueTarget);
}

function isContinueTarget(value: unknown): value is ContinueTarget {
  if (typeof value !== 'object' || value === null) return false;
  const candidate: Record<string, unknown> = value as Record<string, unknown>;
  const emulator: unknown = candidate['emulator'];
  return isPid(candidate['pid']) && typeof candidate['resumesWork'] === 'boolean' && (emulator === null || typeof emulator === 'string');
}

export function isPauseTargets(value: unknown): value is PauseTarget[] {
  return Array.isArray(value) && value.every(isPauseTarget);
}

function isPauseTarget(value: unknown): value is PauseTarget {
  if (typeof value !== 'object' || value === null) return false;
  const candidate: Record<string, unknown> = value as Record<string, unknown>;
  return isPid(candidate['pid']) && typeof candidate['interrupt'] === 'boolean';
}
