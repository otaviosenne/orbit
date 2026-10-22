import { describe, expect, it } from 'vitest';
import type { DraftSegment } from '../src/renderer/sheet/marker-segments';
import { segmentText, splitDraftMarkers } from '../src/renderer/sheet/marker-segments';

describe('splitDraftMarkers', () => {
  it('cuts the draft into text and markers with their hidden brackets apart', () => {
    expect(splitDraftMarkers('see [Image #1] and [Image #12]')).toEqual([
      { kind: 'text', text: 'see ' },
      { kind: 'marker', attachment: 'image', number: 1, opening: '[', label: 'Image #1', closing: ']' },
      { kind: 'text', text: ' and ' },
      { kind: 'marker', attachment: 'image', number: 12, opening: '[', label: 'Image #12', closing: ']' },
    ]);
  });

  it('keeps every character, so the painted text matches the field', () => {
    const draft: string = '[Image #2]\nline two [Image #1] [Image #3';
    const segments: DraftSegment[] = splitDraftMarkers(draft);
    expect(segments.map(segmentText).join('')).toBe(draft);
  });

  it('knows each marker\'s kind from its word', () => {
    expect(splitDraftMarkers('[PDF #2] [Video #3]')).toEqual([
      { kind: 'marker', attachment: 'pdf', number: 2, opening: '[', label: 'PDF #2', closing: ']' },
      { kind: 'text', text: ' ' },
      { kind: 'marker', attachment: 'video', number: 3, opening: '[', label: 'Video #3', closing: ']' },
    ]);
  });

  it('leaves plain text and an empty draft as they are', () => {
    expect(splitDraftMarkers('just words')).toEqual([{ kind: 'text', text: 'just words' }]);
    expect(splitDraftMarkers('')).toEqual([]);
  });
});
