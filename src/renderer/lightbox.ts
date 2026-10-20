import { requireElement } from './dom';

const CLOSE_KEY: string = 'Escape';

// Full-window image viewer on a 70% dark backdrop; clicking anywhere but the image (or Esc) closes it.
export class Lightbox {
  private readonly root: HTMLElement = requireElement('#lightbox');
  private readonly image: HTMLImageElement = requireElement('#lightbox-image');

  constructor() {
    this.root.addEventListener('click', (event: MouseEvent): void => {
      if (event.target !== this.image) this.close();
    });
    document.addEventListener('keydown', (event: KeyboardEvent): void => {
      if (event.key === CLOSE_KEY && this.isOpen) {
        event.stopPropagation();
        this.close();
      }
    }, true);
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  open(source: string): void {
    this.image.src = source;
    this.root.hidden = false;
  }

  close(): void {
    this.root.hidden = true;
    this.image.removeAttribute('src');
  }
}
