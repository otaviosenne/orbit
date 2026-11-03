import type { ServerLink } from '../../shared/types';
import { copyText } from '../clipboard';
import { element } from '../dom';
import { showToast } from '../toast';
import { serverAddress } from './server-address';

const GAP_PX: number = 4;
const UNPUBLISHED_NOTE: string = 'Only opens on the computer: the tunnel does not publish this port';

// The chat's servers in a small menu under the button that opened it: a row per port, which copies its address.
// One menu for the whole window, like the card menu; a press anywhere else closes it.
export class ServerMenu {
  private readonly root: HTMLDivElement = element('div', 'card-menu server-menu');

  constructor() {
    document.body.append(this.root);
    document.addEventListener('pointerdown', (event: PointerEvent): void => {
      if (!this.root.contains(event.target as Node)) this.close();
    }, true);
    window.addEventListener('blur', (): void => this.close());
  }

  open(servers: readonly ServerLink[], anchor: HTMLElement): void {
    this.root.replaceChildren(...servers.map((server: ServerLink) => this.row(server)));
    this.root.classList.add('is-open');
    const box: DOMRect = anchor.getBoundingClientRect();
    // Kept inside the window when the button sits near its right or bottom edge.
    this.root.style.left = `${Math.max(0, Math.min(box.left, window.innerWidth - this.root.offsetWidth))}px`;
    this.root.style.top = `${Math.max(0, Math.min(box.bottom + GAP_PX, window.innerHeight - this.root.offsetHeight))}px`;
  }

  close(): void {
    this.root.classList.remove('is-open');
  }

  private row(server: ServerLink): HTMLButtonElement {
    const row: HTMLButtonElement = element('button', 'card-menu-item server-menu-item');
    row.type = 'button';
    const text: HTMLSpanElement = element('span', 'server-menu-text');
    text.append(element('span', 'server-menu-name', `${server.port} · ${server.name}`), element('span', 'server-menu-url', server.publicUrl ?? `localhost:${server.port} · not on the tunnel`));
    row.append(text);
    // Copied inside the click: a phone refuses a copy that comes later.
    row.addEventListener('click', (): void => {
      this.close();
      const address: string = serverAddress(server);
      void copyText(address).then((copied: boolean): void => showToast(copied
        ? { title: `Copied the ${server.name} address`, preview: address, ...(server.publicUrl === null ? { note: UNPUBLISHED_NOTE } : {}) }
        : { title: 'The browser did not allow copying', preview: address, isProblem: true }));
    });
    return row;
  }
}

let shared: ServerMenu | null = null;

// The board's cards and the chat panel share one menu, made on first use.
export function serverMenu(): ServerMenu {
  shared ??= new ServerMenu();
  return shared;
}
