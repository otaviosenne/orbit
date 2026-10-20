import { isPermissionMode } from '../../shared/permission-modes';
import type { PermissionMode } from '../../shared/permission-modes';
import type { LineFilter } from '../jsonl';
import type { TranscriptRecord } from '../transcript-record';

// Cheap substring check, so only the records that can carry a mode are parsed.
export const isPermissionModeLine: LineFilter = (line: string): boolean => line.includes('"permissionMode"');

// Claude Code re-logs the mode on each turn, not when Shift+Tab changes it, so this lags the terminal.
export function permissionModeFrom(records: readonly TranscriptRecord[]): PermissionMode | null {
  for (let index: number = records.length - 1; index >= 0; index--) {
    const record: TranscriptRecord | undefined = records[index];
    if (record?.isSidechain !== true && isPermissionMode(record?.permissionMode)) return record.permissionMode;
  }
  return null;
}
