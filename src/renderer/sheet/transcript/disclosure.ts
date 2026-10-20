import { element } from '../../dom';

export const DISCLOSURE_KEY_ATTRIBUTE: string = 'disclosureKey';

export type OpenState = (key: string) => boolean;

// A collapsed row that expands in place; the key lets the list keep it open across refreshes.
export function disclosure(key: string, className: string, summary: readonly Node[], body: readonly Node[], isOpen: OpenState): HTMLDetailsElement {
  const details: HTMLDetailsElement = element('details', `disclosure ${className}`);
  details.dataset[DISCLOSURE_KEY_ATTRIBUTE] = key;
  details.open = isOpen(key);
  const head: HTMLElement = element('summary', 'disclosure-summary');
  head.append(...summary);
  const content: HTMLDivElement = element('div', 'disclosure-body');
  content.append(...body);
  details.append(head, content);
  return details;
}
