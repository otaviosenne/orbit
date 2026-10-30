import { beforeAll, describe, expect, it, vi } from 'vitest';
import { isPickingText, watchTextPicking } from '../src/renderer/sheet/voice/text-picking';

// The renderer runs in a window; the tests stand one in with only what the module reads.
const fakeWindow: EventTarget & { selected: string; getSelection: () => Pick<Selection, 'isCollapsed' | 'toString'> } = Object.assign(new EventTarget(), {
  selected: '',
  getSelection(): Pick<Selection, 'isCollapsed' | 'toString'> {
    const text: string = fakeWindow.selected;
    return { isCollapsed: text.length === 0, toString: (): string => text };
  },
});

function fire(type: string): void {
  fakeWindow.dispatchEvent(new Event(type));
}

describe('text picking', () => {
  beforeAll(() => {
    vi.stubGlobal('window', fakeWindow);
    watchTextPicking();
  });

  it('is off with nothing pressed or selected', () => {
    expect(isPickingText()).toBe(false);
  });

  it('holds while a press is still choosing text, and ends with the release', () => {
    fire('pointerdown');
    expect(isPickingText()).toBe(true);
    fire('pointerup');
    expect(isPickingText()).toBe(false);
  });

  it('holds while text stays selected after the release', () => {
    fakeWindow.selected = 'a line of the reply';
    expect(isPickingText()).toBe(true);
    fakeWindow.selected = '';
    expect(isPickingText()).toBe(false);
  });

  it('forgets a press when the window loses focus mid-drag', () => {
    fire('pointerdown');
    fire('blur');
    expect(isPickingText()).toBe(false);
  });
});
