import type { MessageImage } from '../../shared/types';
import type { Confirmation } from './pending-messages';

export interface ImageSeed {
  readonly key: string;
  readonly source: string;
}

// What becomes of a confirmed message's local image copies: some keep showing under the transcript's keys, the rest go.
export interface ImageHandover {
  readonly seeds: ImageSeed[];
  readonly unused: string[];
}

// Images are pasted in the order they were attached, and the transcript lists them in that same order.
export function handOverImages(confirmation: Confirmation): ImageHandover {
  const urls: readonly string[] = confirmation.message.imageUrls;
  const images: readonly MessageImage[] = confirmation.item.images;
  const seeds: ImageSeed[] = urls.slice(0, images.length).flatMap((source: string, index: number): ImageSeed[] => {
    const image: MessageImage | undefined = images[index];
    return image === undefined ? [] : [{ key: image.key, source }];
  });
  return { seeds, unused: urls.slice(seeds.length) };
}
