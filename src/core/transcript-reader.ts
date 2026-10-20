import type { TranscriptItem } from '../shared/types';
import { TRANSCRIPT_ITEM_LIMIT } from './config';
import { FileMemo } from './file-memo';
import { isTranscriptLine, parseRecords } from './jsonl';
import type { TailSearchResult } from './tail-search';
import { searchTail } from './tail-search';
import type { ChatNameResolver, ImageBlob, ImageStore, TranscriptSource } from './transcript-extractor';
import { extractTranscript } from './transcript-extractor';

// Listing the live chats reads every session file, so it is only done when a transcript really has to be parsed.
export type ChatNamesLoader = () => Promise<ChatNameResolver>;

interface ReadTranscript {
  // Every item the window held, oldest first; a smaller page later is a slice of the same read.
  readonly items: TranscriptItem[];
  readonly images: ImageStore;
  // The window reached the start of the file or the size cap, so asking for more finds nothing older.
  readonly isWhole: boolean;
}

// Asks for everything within the size cap; used to find an image older than the recent window.
const EVERY_ITEM: number = Number.POSITIVE_INFINITY;

export class TranscriptReader {
  private readonly memo: FileMemo<ReadTranscript> = new FileMemo();

  // The last `limit` items; fewer than asked means there is nothing older to read.
  async read(
    transcriptPath: string,
    loadNames: ChatNamesLoader,
    source: TranscriptSource = 'chat',
    limit: number = TRANSCRIPT_ITEM_LIMIT,
  ): Promise<TranscriptItem[]> {
    return (await this.load(transcriptPath, loadNames, source, limit)).items.slice(-limit);
  }

  // A thumbnail of a message paged in from deep history may sit before the recent window.
  async image(transcriptPath: string, key: string, loadNames: ChatNamesLoader): Promise<ImageBlob | null> {
    const recent: ReadTranscript = await this.load(transcriptPath, loadNames, 'chat', TRANSCRIPT_ITEM_LIMIT);
    const blob: ImageBlob | undefined = recent.images.get(key);
    if (blob !== undefined || recent.isWhole) return blob ?? null;
    return (await this.load(transcriptPath, loadNames, 'chat', EVERY_ITEM)).images.get(key) ?? null;
  }

  // Each file is only ever read as one source (a chat's or an agent's), so the memo stays keyed by path.
  private load(transcriptPath: string, loadNames: ChatNamesLoader, source: TranscriptSource, limit: number): Promise<ReadTranscript> {
    return this.memo.get(
      transcriptPath,
      (): Promise<ReadTranscript> => readRecentItems(transcriptPath, loadNames, source, limit),
      (cached: ReadTranscript): boolean => cached.isWhole || cached.items.length >= limit,
    );
  }
}

async function readRecentItems(transcriptPath: string, loadNames: ChatNamesLoader, source: TranscriptSource, limit: number): Promise<ReadTranscript> {
  const resolveChat: ChatNameResolver = await loadNames();
  return searchTail(transcriptPath, (text: string): TailSearchResult<ReadTranscript> => findRecentItems(text, resolveChat, source, limit));
}

function findRecentItems(text: string, resolveChat: ChatNameResolver, source: TranscriptSource, limit: number): TailSearchResult<ReadTranscript> {
  const images: ImageStore = new Map();
  const items: TranscriptItem[] = extractTranscript(parseRecords(text, isTranscriptLine), EVERY_ITEM, resolveChat, images, source);
  const satisfied: boolean = items.length >= limit;
  // searchTail only settles for an unsatisfied search once the window reached the file's start or the cap.
  return { value: { items, images, isWhole: !satisfied }, satisfied };
}
