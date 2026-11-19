import { describe, expect, it } from 'vitest';
import { resumeNoteOf } from '../src/main/routes/route-args';

describe('resumeNoteOf', () => {
  it('reads the note, and the true an older Orbit Web page sends for a cut chat', () => {
    expect(resumeNoteOf('cut')).toBe('cut');
    expect(resumeNoteOf(true)).toBe('cut');
    expect(resumeNoteOf('paused')).toBe('paused');
    for (const value of [null, undefined, false, 'other', 1]) expect(resumeNoteOf(value)).toBeNull();
  });
});
