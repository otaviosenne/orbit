import { describe, expect, it } from 'vitest';
import { buildVersionIn, shouldReload } from '../src/web/refresh/build-version';

describe('the Orbit Web build stamp', () => {
  it('is read from the app script of the page', () => {
    expect(buildVersionIn('<link href="web.css?v=mvu0t4zz" /><script src="app.js?v=mvu0t4zz"></script>')).toBe('mvu0t4zz');
    expect(buildVersionIn('<script src="app.js"></script>')).toBeNull();
  });

  it('reloads only for a different build and while nothing is being written', () => {
    expect(shouldReload('old', 'new', false)).toBe(true);
    expect(shouldReload('same', 'same', false)).toBe(false);
    expect(shouldReload('old', 'new', true)).toBe(false);
    expect(shouldReload('old', null, false)).toBe(false);
    expect(shouldReload(null, 'new', false)).toBe(false);
  });
});
