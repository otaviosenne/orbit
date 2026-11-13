import { imageMediaTypeOf } from '../shared/attachment-kinds';
import { imageToken, imageTokenPattern } from '../shared/image-tokens';

// A picture a chat put in its reply as markdown pointing at a file on this machine (a screenshot, say).
export interface ReplyImage {
  readonly number: number;
  readonly path: string;
}

export interface ReplyWithImages {
  // The reply with each picture swapped for an "[Image #N]" chip, as the user's own messages read.
  readonly text: string;
  readonly images: readonly ReplyImage[];
}

// ![alt](/abs/path.png) or ![alt](~/path.png), optionally <wrapped> or followed by a "title". Only local files:
// a web address keeps rendering as markdown.
const LOCAL_IMAGE_SOURCE: string = String.raw`!\[[^\]]*\]\(\s*<?((?:\/|~\/)[^)\s>]+)>?(?:\s+"[^"]*")?\s*\)`;

function localImagePattern(): RegExp {
  return new RegExp(LOCAL_IMAGE_SOURCE, 'g');
}

// Numbers continue after any "[Image #N]" the reply already quotes (the user's own pictures), so chips never clash;
// the same file shown twice keeps one number.
export function extractReplyImages(text: string): ReplyWithImages {
  const numbers: Map<string, number> = new Map();
  let next: number = highestImageNumber(text) + 1;
  const swapped: string = text.replace(localImagePattern(), (whole: string, path: string): string => {
    if (imageMediaTypeOf(path) === null) return whole;
    let number: number | undefined = numbers.get(path);
    if (number === undefined) {
      number = next++;
      numbers.set(path, number);
    }
    return imageToken(number);
  });
  const images: ReplyImage[] = [...numbers].map(([path, number]: [string, number]): ReplyImage => ({ number, path }));
  return { text: swapped, images };
}

function highestImageNumber(text: string): number {
  return Math.max(0, ...[...text.matchAll(imageTokenPattern())].map((match: RegExpMatchArray): number => Number(match[1])));
}
