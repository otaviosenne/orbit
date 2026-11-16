import type { Lightbox } from '../lightbox';
import type { ImageLoader } from '../lightbox-gallery';
import { ImageCache } from './image-cache';
import type { ImageHandover, ImageSeed } from './pending-images';
import { handOverImages } from './pending-images';
import type { Confirmation, PendingAttachment, PendingMessage } from './pending-messages';
import { fileUrlsOf } from './pending-messages';
import type { ImageLookup } from './transcript/message-thumbnails';
import { fillThumbnails, GRID_BUTTON_SELECTOR, IMAGE_KEY_ATTRIBUTE, missingThumbnailKeys, shownSource, THUMBNAIL_SELECTOR } from './transcript/message-thumbnails';

const IMAGE_TRIGGER_SELECTOR: string = `.image-chip, ${THUMBNAIL_SELECTOR}`;
const MESSAGE_SELECTOR: string = '.message';

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
      // The confirmed bubble's file chips open the saved files by their paths from now on.
      fileUrlsOf(confirmation.message).forEach(revoke);
    }
  }

  release(dropped: readonly PendingMessage[]): void {
    for (const message of dropped) message.attachments.forEach((attachment: PendingAttachment): void => revoke(attachment.url));
  }

  clear(): void {
    this.cache.clear();
  }

  // The clicked picture opens among the rest of its message's, so the viewer can step or lay them all out.
  private async open(target: EventTarget | null): Promise<void> {
    if (!(target instanceof Element)) return;
    const gridButton: HTMLElement | null = target.closest<HTMLElement>(GRID_BUTTON_SELECTOR);
    if (gridButton !== null) {
      this.lightbox.openGallery(this.loadersOf(messageThumbnails(gridButton)), 0, true);
      return;
    }
    const trigger: HTMLElement | null = target.closest<HTMLElement>(IMAGE_TRIGGER_SELECTOR);
    if (trigger === null) return;
    const thumbnails: HTMLElement[] = messageThumbnails(trigger);
    const index: number = thumbnails.findIndex((thumbnail: HTMLElement): boolean => isSameImage(thumbnail, trigger));
    if (index >= 0) {
      this.lightbox.openGallery(this.loadersOf(thumbnails), index);
      return;
    }
    const source: string | null = await this.sourceOf(trigger);
    if (source !== null) this.lightbox.open(source);
  }

  private loadersOf(thumbnails: readonly HTMLElement[]): ImageLoader[] {
    return thumbnails.map((thumbnail: HTMLElement): ImageLoader => (): Promise<string | null> => this.sourceOf(thumbnail));
  }

  private sourceOf(trigger: HTMLElement): Promise<string | null> {
    const shown: string | null = shownSource(trigger);
    return shown !== null ? Promise.resolve(shown) : this.fetchFor(trigger);
  }

  // Chips carry only a key; their pixels come from the cache, or from the transcript the first time.
  private fetchFor(trigger: HTMLElement): Promise<string | null> {
    const key: string | undefined = trigger.dataset[IMAGE_KEY_ATTRIBUTE];
    const sessionId: string | null = this.sessionId();
    return key === undefined || sessionId === null ? Promise.resolve(null) : this.cache.load(sessionId, key);
  }
}

function messageThumbnails(trigger: HTMLElement): HTMLElement[] {
  const message: HTMLElement | null = trigger.closest<HTMLElement>(MESSAGE_SELECTOR);
  return message === null ? [] : [...message.querySelectorAll<HTMLElement>(THUMBNAIL_SELECTOR)];
}

// A chip names its picture by key; a thumbnail of a message still being sent has no key, only itself.
function isSameImage(thumbnail: HTMLElement, trigger: HTMLElement): boolean {
  if (thumbnail === trigger) return true;
  const key: string | undefined = trigger.dataset[IMAGE_KEY_ATTRIBUTE];
  return key !== undefined && thumbnail.dataset[IMAGE_KEY_ATTRIBUTE] === key;
}

function revoke(source: string): void {
  URL.revokeObjectURL(source);
}
