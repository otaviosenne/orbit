import { FileViewer } from '../files/file-viewer';
import type { FileView } from '../files/file-view';
import type { Lightbox } from '../lightbox';
import { FILE_CHIP_SELECTOR, fileViewOf } from './transcript/file-chips';

// The file chips in a chat's thread: a click opens the file's player, PDF or path.
export class ThreadFiles {
  private readonly viewer: FileViewer;

  constructor(root: HTMLElement, lightbox: Lightbox) {
    this.viewer = new FileViewer(lightbox);
    root.addEventListener('click', (event: MouseEvent): void => this.open(event.target));
  }

  private open(target: EventTarget | null): void {
    const chip: HTMLElement | null = target instanceof Element ? target.closest<HTMLElement>(FILE_CHIP_SELECTOR) : null;
    const view: FileView | null = chip === null ? null : fileViewOf(chip);
    if (view !== null) this.viewer.open(view);
  }
}
