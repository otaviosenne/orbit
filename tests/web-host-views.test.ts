import { describe, expect, it } from 'vitest';
import { availableQuestions, FAQ } from '../src/renderer/help/faq';
import type { FaqEntry } from '../src/renderer/help/faq';
import type { ViewName } from '../src/renderer/nav';
import { availableTabs, VIEW_TABS } from '../src/renderer/nav';

function tabNames(isWeb: boolean): ViewName[] {
  return availableTabs(isWeb).map((tab: { readonly name: ViewName }) => tab.name);
}

function questionIds(entries: readonly FaqEntry[]): string[] {
  return entries.map((entry: FaqEntry) => entry.id);
}

describe('what Orbit Web leaves out', () => {
  it('has no Panel tab, and the desktop keeps every tab', () => {
    expect(tabNames(true)).not.toContain('grid');
    expect(tabNames(true)).toContain('board');
    expect(availableTabs(false)).toEqual(VIEW_TABS);
  });

  it('drops the Panel question from Help only on the web', () => {
    expect(questionIds(availableQuestions(true))).not.toContain('panel-view');
    expect(availableQuestions(false)).toEqual(FAQ);
  });
});
