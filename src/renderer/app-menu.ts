import { element } from './dom';
import { BUG_ICON, GITHUB_ICON, QUESTION_ICON } from './icons';
import { actionShortcut } from './shortcuts/shortcut-catalog';
import { shortcutKeysText } from './shortcuts/shortcut-hint';

const REPOSITORY_URL: string = 'https://github.com/otaviosenne/orbit';
const ISSUES_URL: string = `${REPOSITORY_URL}/issues`;
const OPEN_CLASS: string = 'is-open';
const CLOSE_KEY: string = 'Escape';

interface AppMenuLink {
  readonly icon: string;
  readonly label: string;
  readonly url: string;
}

const LINKS: readonly AppMenuLink[] = [
  { icon: GITHUB_ICON, label: 'GitHub repository', url: REPOSITORY_URL },
  { icon: BUG_ICON, label: 'Report an issue', url: ISSUES_URL },
];

// Clicking the wordmark drops down Help and links about Orbit itself; the links open in the browser (the
// window sends every link outside).
export function attachAppMenu(trigger: HTMLElement, openHelp: () => void): void {
  const menu: HTMLDivElement = element('div', 'card-menu app-menu');
  menu.append(renderHelpItem(openHelp), ...LINKS.map(renderLink));
  document.body.append(menu);
  trigger.classList.add('has-menu');
  trigger.addEventListener('click', (): void => toggle(menu, trigger));
  document.addEventListener('pointerdown', (event: PointerEvent): void => {
    if (!menu.contains(event.target as Node) && !trigger.contains(event.target as Node)) menu.classList.remove(OPEN_CLASS);
  }, true);
  document.addEventListener('keydown', (event: KeyboardEvent): void => {
    if (event.key === CLOSE_KEY) menu.classList.remove(OPEN_CLASS);
  });
  menu.addEventListener('click', (): void => menu.classList.remove(OPEN_CLASS));
}

function toggle(menu: HTMLElement, trigger: HTMLElement): void {
  const box: DOMRect = trigger.getBoundingClientRect();
  menu.style.left = `${box.left}px`;
  menu.style.top = `${box.bottom + MENU_OFFSET_PX}px`;
  menu.classList.toggle(OPEN_CLASS);
}

// A little gap under the wordmark, like the New chat menu.
const MENU_OFFSET_PX: number = 6;

// Shows its key on the right, the way a macOS menu item does.
function renderHelpItem(openHelp: () => void): HTMLButtonElement {
  const button: HTMLButtonElement = element('button', 'card-menu-item app-menu-help');
  button.type = 'button';
  button.innerHTML = QUESTION_ICON;
  button.append(element('span', '', 'Help'), element('kbd', 'app-menu-key', shortcutKeysText(actionShortcut('help'))));
  button.addEventListener('click', openHelp);
  return button;
}

function renderLink(link: AppMenuLink): HTMLAnchorElement {
  const anchor: HTMLAnchorElement = element('a', 'card-menu-item');
  anchor.href = link.url;
  anchor.target = '_blank';
  anchor.innerHTML = link.icon;
  anchor.append(element('span', '', link.label));
  return anchor;
}
