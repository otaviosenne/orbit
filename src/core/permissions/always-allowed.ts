import { join } from 'node:path';
import { alwaysApprove, isAlwaysApproved } from '../approvals/always-approved';
import { APPROVALS_DIR } from '../approvals/approval-file';

// Chats whose tool permission prompts Orbit answers "Yes" by itself: one empty file per Claude Code session, kept apart
// from the chats always approved for main and releases.
const PERMISSIONS_FOLDER: string = 'always-permissions';
export const ALWAYS_ALLOWED_DIR: string = join(APPROVALS_DIR, '..', PERMISSIONS_FOLDER);

export function alwaysAllowPermissions(sessionId: string, dir: string = ALWAYS_ALLOWED_DIR): Promise<void> {
  return alwaysApprove(sessionId, dir);
}

export function allowsPermissionsAlways(sessionId: string, dir: string = ALWAYS_ALLOWED_DIR): Promise<boolean> {
  return isAlwaysApproved(sessionId, dir);
}
