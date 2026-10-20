import type { ActionResult, LauncherEntry } from '../shared/types';
import { element } from './dom';
import { CARET_DOWN_ICON, PLUS_ICON } from './icons';
import type { LaunchListener } from './launch-watch';
import { newChatTarget } from './launch-watch';
import { renderLauncherMenu } from './new-chat/launcher-menu';
import { ShortcutForm } from './new-chat/shortcut-form';

const LAST_LAUNCHER_KEY: string = 'orbit.lastLauncher';
const CLOSE_KEY: string = 'Escape';
// Long enough to read "Opening…"; the new chat opens on another workspace, so nothing else shows it started.
const FEEDBACK_MS: number = 1500;

// Top-right "New chat": left click reopens the last project, right click (or the caret) lists every SUPER+D entry.
export class NewChatButton {
  private readonly main: HTMLButtonElement = element('button', 'new-chat-main');
  private readonly label: HTMLSpanElement = element('span', 'new-chat-label', 'New chat');
  private readonly menu: HTMLDivElement = element('div', 'new-chat-menu');
  private readonly form: ShortcutForm = new ShortcutForm(
    { saved: (): void => void this.showList(), cancel: (): void => void this.showList() },
    (): readonly string[] => this.entries.map((entry: LauncherEntry) => entry.name),
  );
  private entries: LauncherEntry[] = [];

  constructor(
    root: HTMLElement,
    private readonly launches: LaunchListener,
  ) {
    this.main.type = 'button';
    this.main.innerHTML = PLUS_ICON;
    this.main.append(this.label);
    const more: HTMLButtonElement = element('button', 'new-chat-more');
    more.type = 'button';
    more.title = 'Choose a project';
    more.innerHTML = CARET_DOWN_ICON;
    this.menu.hidden = true;
    root.append(this.main, more, this.menu);
    this.main.addEventListener('click', (): void => void this.open(this.last()));
    more.addEventListener('click', (): void => void this.toggleMenu());
    root.addEventListener('contextmenu', (event: MouseEvent): void => {
      event.preventDefault();
      // A right click inside the open menu (say, in a form field) must not fold the menu away.
      if (!this.menu.contains(event.target as Node)) void this.toggleMenu();
    });
    document.addEventListener('pointerdown', (event: PointerEvent): void => {
      if (!root.contains(event.target as Node)) this.closeMenu();
    });
    document.addEventListener('keydown', (event: KeyboardEvent): void => {
      if (event.key === CLOSE_KEY) this.closeMenu();
    });
    void this.load();
  }

  private async load(): Promise<void> {
    this.entries = await window.radar.listLaunchers();
    this.showTarget();
  }

  private last(): string | null {
    const saved: string | null = readLast();
    if (saved !== null && this.entries.some((entry: LauncherEntry) => entry.name === saved)) return saved;
    return this.entries[0]?.name ?? null;
  }

  // The button stays "New chat"; which project it opens is in the tooltip.
  private showTarget(): void {
    const last: string | null = this.last();
    this.label.textContent = 'New chat';
    this.main.title = last === null ? 'No projects found' : `Open a new chat in ${last} (right-click for all projects)`;
  }

  // The watcher is told before launching, so the chat is recognized even if it registers before the launch call returns.
  private async open(name: string | null): Promise<void> {
    const entry: LauncherEntry | undefined = this.entries.find((candidate: LauncherEntry) => candidate.name === name);
    if (entry === undefined) return;
    this.closeMenu();
    writeLast(entry.name);
    this.label.textContent = 'Opening…';
    this.main.disabled = true;
    const launchedAt: number = Date.now();
    this.launches.expect(newChatTarget(entry), launchedAt);
    const result: ActionResult = await window.radar.openLauncher(entry.name);
    if (!result.ok) {
      this.launches.fail(launchedAt, result.error ?? 'Could not open the chat.');
      this.label.textContent = 'Failed';
    }
    window.setTimeout((): void => {
      this.main.disabled = false;
      this.showTarget();
    }, FEEDBACK_MS);
  }

  private async toggleMenu(): Promise<void> {
    if (!this.menu.hidden) return this.closeMenu();
    await this.showList();
    this.menu.hidden = false;
  }

  // Re-reads the list each time, so a project added to ~/.bashrc or a shortcut just saved shows up without restarting.
  private async showList(): Promise<void> {
    await this.load();
    this.menu.classList.remove('is-form');
    this.menu.replaceChildren(
      ...renderLauncherMenu(this.entries, this.last(), {
        open: (name: string): void => void this.open(name),
        addShortcut: (): void => this.showForm(),
      }),
    );
  }

  private showForm(): void {
    this.menu.classList.add('is-form');
    this.menu.replaceChildren(this.form.root);
    this.form.open();
  }

  private closeMenu(): void {
    this.menu.hidden = true;
  }
}

function readLast(): string | null {
  try {
    return localStorage.getItem(LAST_LAUNCHER_KEY);
  } catch {
    return null;
  }
}

function writeLast(name: string): void {
  try {
    localStorage.setItem(LAST_LAUNCHER_KEY, name);
  } catch {
    // The choice just is not remembered.
  }
}
