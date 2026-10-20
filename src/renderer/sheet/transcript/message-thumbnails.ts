import type { MessageImage } from '../../../shared/types';
import { element } from '../../dom';

// Both image chips and thumbnails carry the image's key here; clicking either opens that image.
export const IMAGE_KEY_ATTRIBUTE: string = 'imageKey';
export const THUMBNAIL_SELECTOR: string = '.message-image';
const PICTURE_SELECTOR: string = '.message-image-picture';

// Where a thumbnail's pixels come from right now; undefined while they are still being fetched.
export type ImageLookup = (key: string) => string | undefined;

export interface ThumbnailSource {
  readonly source: string | undefined;
  // Transcript images are fetched by key; a message still being sent shows its local copies instead.
  readonly key?: string;
}

// The pictures a message carries, shown above its text the way chat apps do.
export function renderThumbnails(sources: readonly ThumbnailSource[]): HTMLElement {
  const row: HTMLDivElement = element('div', 'message-images');
  row.append(...sources.map((source: ThumbnailSource, index: number) => renderThumbnail(source, index)));
  return row;
}

export function transcriptThumbnails(images: readonly MessageImage[], lookup: ImageLookup): ThumbnailSource[] {
  return images.map((image: MessageImage): ThumbnailSource => ({ key: image.key, source: lookup(image.key) }));
}

function renderThumbnail(thumbnail: ThumbnailSource, index: number): HTMLElement {
  const button: HTMLButtonElement = element('button', 'message-image');
  button.type = 'button';
  button.setAttribute('aria-label', `Open image ${index + 1}`);
  if (thumbnail.key !== undefined) button.dataset[IMAGE_KEY_ATTRIBUTE] = thumbnail.key;
  const picture: HTMLImageElement = element('img', 'message-image-picture');
  picture.alt = '';
  picture.draggable = false;
  if (thumbnail.source !== undefined) picture.src = thumbnail.source;
  button.append(picture);
  return button;
}

// The attribute, not the property: an img without src reports the page's own URL as its src.
export function shownSource(thumbnail: HTMLElement): string | null {
  return thumbnail.querySelector<HTMLImageElement>(PICTURE_SELECTOR)?.getAttribute('src') ?? null;
}

// One fetch per key, even when the same image shows in several places.
export function missingThumbnailKeys(root: HTMLElement): string[] {
  const thumbnails: HTMLElement[] = [...root.querySelectorAll<HTMLElement>(THUMBNAIL_SELECTOR)];
  const keys: string[] = thumbnails.filter((thumbnail: HTMLElement) => shownSource(thumbnail) === null).flatMap((thumbnail: HTMLElement) => thumbnail.dataset[IMAGE_KEY_ATTRIBUTE] ?? []);
  return [...new Set(keys)];
}

// Fills the pictures in place when a fetch completes, so the thread is not rebuilt and nothing jumps.
export function fillThumbnails(root: HTMLElement, key: string, source: string): void {
  for (const thumbnail of root.querySelectorAll<HTMLElement>(THUMBNAIL_SELECTOR)) {
    if (thumbnail.dataset[IMAGE_KEY_ATTRIBUTE] !== key) continue;
    thumbnail.querySelector<HTMLImageElement>(PICTURE_SELECTOR)?.setAttribute('src', source);
  }
}
