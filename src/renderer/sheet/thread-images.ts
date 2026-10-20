import type { Lightbox } from '../lightbox';
import { ImageCache } from './image-cache';
import type { ImageHandover, ImageSeed } from './pending-images';
import { handOverImages } from './pending-images';
import type { Confirmation, PendingMessage } from './pending-messages';
import type { ImageLookup } from './transcript/message-thumbnails';
import { fillThumbnails, IMAGE_KEY_ATTRIBUTE, missingThumbnailKeys, shownSource, THUMBNAIL_SELECTOR } from './transcript/message-thumbnails';

const IMAGE_TRIGGER_SELECTOR: string = `.image-chip, ${THUMBNAIL_SELECTOR}`;

export type SessionLookup = () => string | null;

// The pictures in a chat's thread: thumbnails, the chips that open them, and the local copies of images just sent.
export class ThreadImages {
  private readonly cache: ImageCache = new ImageCache(
    (sessionId: string, key: string): Promise<string | null> => window.radar.getImage(sessionId, key),
    revoke,
  );

  readonly lookup: ImageLookup = (key: string): string | undefined => this.cache.get(key);

  constructor(private readonly root: HTMLElement, private readonly lightbox: Lightbox, private readonly sessionId: SessionLookup) {
    root.addEventListener('click', (event: MouseEvent): void => void this.open(event.target));
  }

  // Thumbnails rendered before their pixels arrived get them filled in as each fetch completes.
  loadMissing(): void {
    const sessionId: string | null = this.sessionId();
    if (sessionId === null) return;
    for (const key of missingThumbnailKeys(this.root)) {
      void this.cache.load(sessionId, key).then((source: string | null): void => {
        if (source !== null && this.sessionId() === sessionId) fillThumbnails(this.root, key, source);
      });
    }
  }

  // The local copies keep showing under the transcript's keys, so the confirmed message does not flash empty.
  adopt(confirmed: readonly Confirmation[]): void {
    for (const confirmation of confirmed) {
      const handover: ImageHandover = handOverImages(confirmation);
      handover.seeds.forEach((seed: ImageSeed): void => this.cache.seed(seed.key, seed.source));
      handover.unused.forEach(revoke);
    }
  }

  release(dropped: readonly PendingMessage[]): void {
    for (const message of dropped) message.imageUrls.forEach(revoke);
  }

  clear(): void {
    this.cache.clear();
  }

  private async open(target: EventTarget | null): Promise<void> {
    const trigger: HTMLElement | null = target instanceof HTMLElement ? target.closest<HTMLElement>(IMAGE_TRIGGER_SELECTOR) : null;
    if (trigger === null) return;
    const source: string | null = shownSource(trigger) ?? (await this.fetchFor(trigger));
    if (source !== null) this.lightbox.open(source);
  }

  // Chips carry only a key; their pixels come from the cache, or from the transcript the first time.
  private fetchFor(trigger: HTMLElement): Promise<string | null> {
    const key: string | undefined = trigger.dataset[IMAGE_KEY_ATTRIBUTE];
    const sessionId: string | null = this.sessionId();
    return key === undefined || sessionId === null ? Promise.resolve(null) : this.cache.load(sessionId, key);
  }
}

function revoke(source: string): void {
  URL.revokeObjectURL(source);
}
