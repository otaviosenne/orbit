import { DESKTOP_ATTACHMENTS_LIMIT_BYTES, formatMegabytes, REMOTE_ATTACHMENTS_LIMIT_BYTES } from '../../shared/attachment-limits';
import { isWebHost } from '../host';

// The files that still fit in one message, in the order given, and a note about the ones that do not.
export interface LimitedFiles {
  readonly accepted: File[];
  readonly problem: string | null;
}

// Orbit Web sends attachments inside one request, so its limit is the server's; the desktop's is far larger.
export function attachmentLimitBytes(): number {
  return isWebHost() ? REMOTE_ATTACHMENTS_LIMIT_BYTES : DESKTOP_ATTACHMENTS_LIMIT_BYTES;
}

export function withinLimit(files: readonly File[], alreadyBytes: number, limitBytes: number): LimitedFiles {
  const accepted: File[] = [];
  const refused: string[] = [];
  let total: number = alreadyBytes;
  for (const file of files) {
    if (total + file.size > limitBytes) {
      refused.push(file.name);
      continue;
    }
    accepted.push(file);
    total += file.size;
  }
  return { accepted, problem: refused.length === 0 ? null : `Too large to send (${formatMegabytes(limitBytes)} per message): ${refused.join(', ')}` };
}
