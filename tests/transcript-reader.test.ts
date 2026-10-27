import { appendFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ChatNameResolver } from '../src/core/transcript-extractor';
import { TranscriptReader } from '../src/core/transcript-reader';
import type { TranscriptItem } from '../src/shared/types';

const MESSAGES: number = 30;
const line = (index: number): string => `${JSON.stringify({ type: 'user', uuid: `u${index}`, message: { content: `message ${index}` } })}\n`;
const ids = (items: readonly TranscriptItem[]): string[] => items.map((item: TranscriptItem) => item.id);

describe('TranscriptReader', () => {
  let dir: string;
  let path: string;
  let nameLoads: number;
  const loadNames = async (): Promise<ChatNameResolver> => {
    nameLoads += 1;
    return (): null => null;
  };

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'orbit-reader-'));
    path = join(dir, 'chat.jsonl');
    nameLoads = 0;
    await writeFile(path, Array.from({ length: MESSAGES }, (_unused: unknown, index: number) => line(index)).join(''));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('answers with the last `limit` items', async () => {
    expect(ids(await new TranscriptReader().read(path, loadNames, 'chat', 3))).toEqual(['u27', 'u28', 'u29']);
  });

  it('shows a message sent while the chat was busy, which Claude Code logs only as a queued prompt', async () => {
    const queued: string = JSON.stringify({
      type: 'attachment',
      uuid: 'a1',
      attachment: { type: 'queued_command', prompt: 'sent while busy', commandMode: 'prompt', delivery_id: 'd1' },
    });
    await appendFile(path, `${queued}\n${line(MESSAGES)}`);
    const items: TranscriptItem[] = await new TranscriptReader().read(path, loadNames, 'chat', 3);
    expect(items.map((item: TranscriptItem) => item.kind === 'message' ? item.text : '')).toEqual(['message 29', 'sent while busy', `message ${MESSAGES}`]);
  });

  it('answers with fewer items than asked once the start of the file is reached', async () => {
    expect(await new TranscriptReader().read(path, loadNames, 'chat', MESSAGES * 2)).toHaveLength(MESSAGES);
  });

  it('serves smaller and repeated pages of an unchanged file without parsing it or listing chats again', async () => {
    const reader: TranscriptReader = new TranscriptReader();
    await reader.read(path, loadNames, 'chat', 10);
    await reader.read(path, loadNames, 'chat', 10);
    await reader.read(path, loadNames, 'chat', 5);
    expect(nameLoads).toBe(1);
  });

  it('reads again once the file grew', async () => {
    const reader: TranscriptReader = new TranscriptReader();
    await reader.read(path, loadNames, 'chat', 2);
    await appendFile(path, line(MESSAGES));
    expect(ids(await reader.read(path, loadNames, 'chat', 2))).toEqual([`u${MESSAGES - 1}`, `u${MESSAGES}`]);
    expect(nameLoads).toBe(2);
  });
});
