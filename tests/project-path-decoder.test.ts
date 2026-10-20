import { mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { decodeProjectDir, encodeProjectPath } from '../src/core/project-path-decoder';

describe('decodeProjectDir', () => {
  it('recovers spaces, underscores and dashes that the encoding collapsed', async () => {
    const root: string = mkdtempSync(join(tmpdir(), 'radar-'));
    const project: string = join(root, 'Client Portal', 'client_portal');
    mkdirSync(project, { recursive: true });
    mkdirSync(join(root, 'Client'));
    expect(await decodeProjectDir(encodeProjectPath(project))).toBe(project);
  });

  it('returns null when nothing on disk matches', async () => {
    expect(await decodeProjectDir('-definitely-not-a-real-path-xyz')).toBeNull();
  });
});
