import { describe, expect, it } from 'vitest';
import { draftMarker, markerKind, renumberedMarker, splitOnDraftMarkers } from '../src/shared/draft-markers';

describe('draft markers', () => {
  it('name each kind with its own word', () => {
    expect(draftMarker('image', 1)).toBe('[Image #1]');
    expect(draftMarker('pdf', 2)).toBe('[PDF #2]');
    expect(draftMarker('file', 3)).toBe('[File #3]');
  });

  it('keep their kind when renumbered', () => {
    expect(markerKind('[Video #4]')).toBe('video');
    expect(renumberedMarker('[Audio #4]', 1)).toBe('[Audio #1]');
  });

  it('cut a draft into text and attachments across every kind', () => {
    expect(splitOnDraftMarkers('a [PDF #2] b [Image #1]', 2)).toEqual([
      { kind: 'text', text: 'a ' },
      { kind: 'image', index: 1 },
      { kind: 'text', text: ' b ' },
      { kind: 'image', index: 0 },
    ]);
  });
});
