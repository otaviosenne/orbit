import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { fileDirectlyIn } from '../src/main/attachment-path';

// The reader serves from ~/.cache/orbit/attachments; a throwaway home stands in for the user's.
const HOME: string = mkdtempSync(join(tmpdir(), 'orbit-attachments-'));
vi.mock('node:os', async (original: () => Promise<typeof import('node:os')>) => ({ ...(await original()), homedir: (): string => HOME }));

const { readAttachment } = await import('../src/main/attachment-reader');
const DIR: string = join(HOME, '.cache', 'orbit', 'attachments');
const OUTSIDE: string = join(HOME, 'secret.pdf');
mkdirSync(join(DIR, 'nested'), { recursive: true });
writeFileSync(join(DIR, 'paper.pdf'), 'pdf bytes');
writeFileSync(join(DIR, 'notes.txt'), 'text');
writeFileSync(join(DIR, 'nested', 'deep.pdf'), 'deep');
writeFileSync(OUTSIDE, 'secret');
symlinkSync(OUTSIDE, join(DIR, 'link.pdf'));

afterAll((): void => rmSync(HOME, { recursive: true, force: true }));

describe('fileDirectlyIn', () => {
  it('accepts only a plain path to a file right inside the folder', () => {
    expect(fileDirectlyIn('/a/dir', '/a/dir/x.pdf')).toBe('/a/dir/x.pdf');
    expect(fileDirectlyIn('/a/dir', '/a/dir/sub/x.pdf')).toBeNull();
    expect(fileDirectlyIn('/a/dir', '/a/dir/../x.pdf')).toBeNull();
    expect(fileDirectlyIn('/a/dir', '/a/dir/x.pdf\0')).toBeNull();
    expect(fileDirectlyIn('/a/dir', 'a/dir/x.pdf')).toBeNull();
  });
});

describe('readAttachment', () => {
  it('serves a viewable file Orbit saved, with its type', async () => {
    const blob = await readAttachment(join(DIR, 'paper.pdf'));
    expect(blob?.mediaType).toBe('application/pdf');
    expect(new TextDecoder().decode(blob?.bytes)).toBe('pdf bytes');
  });

  it('refuses kinds the viewer does not show, sub-folders, links out and paths elsewhere', async () => {
    expect(await readAttachment(join(DIR, 'notes.txt'))).toBeNull();
    expect(await readAttachment(join(DIR, 'nested', 'deep.pdf'))).toBeNull();
    expect(await readAttachment(join(DIR, 'link.pdf'))).toBeNull();
    expect(await readAttachment(OUTSIDE)).toBeNull();
    expect(await readAttachment(`${DIR}/../secret.pdf`)).toBeNull();
    expect(await readAttachment(join(DIR, 'missing.pdf'))).toBeNull();
    expect(await readAttachment(42)).toBeNull();
  });
});
