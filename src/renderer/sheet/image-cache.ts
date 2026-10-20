export type ImageLoader = (sessionId: string, key: string) => Promise<string | null>;
export type SourceRelease = (source: string) => void;

// Pixels of a chat's images by key, so the thread's frequent rebuilds show them at once instead of refetching.
export class ImageCache {
  // null remembers an image that could not be fetched, so rebuilds do not keep asking for it.
  private readonly sources: Map<string, string | null> = new Map();
  private readonly inFlight: Map<string, Promise<string | null>> = new Map();
  // Seeded sources are object URLs this cache now owns and must release.
  private readonly owned: Set<string> = new Set();
  // A fetch that resolves after clear() belongs to a chat no longer shown.
  private generation: number = 0;

  constructor(private readonly loadImage: ImageLoader, private readonly release: SourceRelease) {}

  get(key: string): string | undefined {
    return this.sources.get(key) ?? undefined;
  }

  load(sessionId: string, key: string): Promise<string | null> {
    const known: string | null | undefined = this.sources.get(key);
    if (known !== undefined) return Promise.resolve(known);
    return this.inFlight.get(key) ?? this.fetch(sessionId, key);
  }

  // Hands the cache a source it can show right away, such as the local copy of an image just sent.
  seed(key: string, source: string): void {
    if (this.get(key) !== undefined) return this.release(source);
    this.sources.set(key, source);
    this.owned.add(source);
  }

  clear(): void {
    for (const source of this.owned) this.release(source);
    this.owned.clear();
    this.sources.clear();
    this.inFlight.clear();
    this.generation++;
  }

  private async fetch(sessionId: string, key: string): Promise<string | null> {
    const generation: number = this.generation;
    const request: Promise<string | null> = this.loadImage(sessionId, key).catch((): null => null);
    this.inFlight.set(key, request);
    const source: string | null = await request;
    if (generation !== this.generation) return source;
    this.inFlight.delete(key);
    if (!this.sources.has(key)) this.sources.set(key, source);
    return this.sources.get(key) ?? null;
  }
}
