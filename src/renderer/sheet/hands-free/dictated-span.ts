import type { DraftAnchor, PlacedText } from '../dictation-placement';
import { placeDictation } from '../dictation-placement';
import { wordCount, wordsAfter } from './unseen-words';

export interface SpanChange {
  // What the span showed before this change (the untouched text on its first change).
  readonly previous: string;
  readonly placed: PlacedText;
}

// Where hands-free words land in one draft: every segment's words, in the order the segments started,
// between the text before and after the caret. Segments overlap while one is refined and the next streams,
// so each keeps its own text and the whole span is placed again on every change.
export class DictatedSpan {
  private readonly texts: Map<number, string> = new Map();
  // How many of each segment's words the draft has taken over (kept or deleted by the user); never placed again.
  private readonly settled: Map<number, number> = new Map();
  private anchor: DraftAnchor | null = null;
  private shown: string = '';

  // The anchor is taken on the first words, so a caret moved before speaking still decides where they go.
  update(segmentId: number, text: string, anchorNow: () => DraftAnchor): SpanChange | null {
    this.texts.set(segmentId, text);
    const joined: string = this.joined();
    if (this.anchor === null && joined.length === 0) return null;
    const anchor: DraftAnchor = this.anchor ?? this.takeAnchor(anchorNow());
    const placed: PlacedText = placeDictation(anchor, joined);
    const previous: string = this.shown;
    this.shown = placed.value;
    return { previous, placed };
  }

  // The draft was edited or replaced under the span: the words it showed now belong to the draft, so a deletion
  // stays deleted, even when a segment's final text arrives. Words still to come go where the caret is then.
  rebase(): void {
    for (const [segmentId, text] of this.texts) this.settled.set(segmentId, wordCount(text));
    this.anchor = null;
    this.shown = '';
  }

  private takeAnchor(anchor: DraftAnchor): DraftAnchor {
    this.anchor = anchor;
    this.shown = `${anchor.before}${anchor.after}`;
    return anchor;
  }

  // The whole draft as this span last left it; null before its first words.
  get lastShown(): string | null {
    return this.anchor === null ? null : this.shown;
  }

  textOf(segmentId: number): string {
    return this.texts.get(segmentId) ?? '';
  }

  private joined(): string {
    return [...this.texts.entries()]
      .sort(([first]: [number, string], [second]: [number, string]): number => first - second)
      .map(([segmentId, text]: [number, string]): string => wordsAfter(text, this.settled.get(segmentId) ?? 0))
      .filter((text: string): boolean => text.length > 0)
      .join(' ');
  }
}
