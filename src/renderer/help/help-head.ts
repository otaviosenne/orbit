import { element } from '../dom';
import { CLOSE_ICON, SEARCH_ICON } from '../icons';

export const HELP_TITLE_ID: string = 'help-title';

// The title row (title and X), then the tools row: the tab control when there is one, and the search.
export function renderHelpHead(tabControl: HTMLElement | null, search: HTMLInputElement, onClose: () => void): HTMLElement {
  const head: HTMLElement = element('header', 'help-head');
  const title: HTMLHeadingElement = element('h2', 'help-title', 'Orbit Help');
  title.id = HELP_TITLE_ID;
  const titleRow: HTMLDivElement = element('div', 'help-title-row');
  titleRow.append(title, renderClose(onClose));
  const tools: HTMLDivElement = element('div', 'help-tools');
  if (tabControl !== null) tools.append(tabControl);
  tools.append(renderSearch(search));
  head.append(titleRow, tools);
  return head;
}

function renderClose(onClose: () => void): HTMLButtonElement {
  const close: HTMLButtonElement = element('button', 'icon-button help-close');
  close.type = 'button';
  close.title = 'Close (Esc)';
  close.setAttribute('aria-label', 'Close help');
  close.innerHTML = CLOSE_ICON;
  close.addEventListener('click', onClose);
  return close;
}

function renderSearch(search: HTMLInputElement): HTMLElement {
  const field: HTMLLabelElement = element('label', 'help-search');
  field.innerHTML = SEARCH_ICON;
  search.type = 'text';
  search.spellcheck = false;
  search.setAttribute('aria-label', 'Search help');
  field.append(search);
  return field;
}
