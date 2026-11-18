import { element } from '../dom';
import { isPhoneLayout } from '../host';
import { CARET_DOWN_ICON, CARET_UP_ICON } from '../icons';

export type StripColumnKind = 'agents' | 'shells';

// More than this and the rest fold behind a chevron, so the thread keeps most of the panel.
const VISIBLE_ROWS: number = 3;
// A phone has no room to spare: a lone row shows, two or more fold entirely behind the chevron.
const PHONE_FOLD_FROM: number = 2;
const TOGGLE_ATTRIBUTE: string = 'stripToggle';

// One column of the strip: its first rows, then a chevron that unfolds the rest of that column only.
export function renderStripColumn(kind: StripColumnKind, rows: readonly HTMLElement[], isExpanded: boolean): HTMLElement {
  const column: HTMLDivElement = element('div', `agent-strip-column agent-strip-${kind}`);
  const shown: number = visibleRows(rows.length, isPhoneLayout());
  column.append(...(isExpanded ? rows : rows.slice(0, shown)));
  const hiddenCount: number = rows.length - shown;
  if (hiddenCount > 0) column.append(renderToggle(kind, hiddenCount, isExpanded));
  return column;
}

// How many rows show while the column is folded.
export function visibleRows(count: number, isPhone: boolean): number {
  if (isPhone) return count >= PHONE_FOLD_FROM ? 0 : count;
  return Math.min(count, VISIBLE_ROWS);
}

// The column a pressed chevron unfolds or folds, if the press was on one.
export function toggledColumn(target: HTMLElement): StripColumnKind | null {
  const kind: string | undefined = target.closest<HTMLElement>('[data-strip-toggle]')?.dataset[TOGGLE_ATTRIBUTE];
  return kind === 'agents' || kind === 'shells' ? kind : null;
}

function renderToggle(kind: StripColumnKind, hiddenCount: number, isExpanded: boolean): HTMLElement {
  const toggle: HTMLButtonElement = element('button', 'agent-strip-toggle');
  toggle.type = 'button';
  toggle.dataset[TOGGLE_ATTRIBUTE] = kind;
  toggle.innerHTML = isExpanded ? CARET_UP_ICON : CARET_DOWN_ICON;
  toggle.append(element('span', '', isExpanded ? 'Show less' : `${hiddenCount} more`));
  return toggle;
}
