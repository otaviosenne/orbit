import { element, requireElement } from './dom';
import type { ImageLoader } from './lightbox-gallery';
import { LightboxGallery } from './lightbox-gallery';

const CLOSE_KEY: string = 'Escape';
const PLAY_KEY: string = ' ';
const PANEL_CLASS: string = 'lightbox-panel';
const MEDIA_SELECTOR: string = 'video, audio';

// The page has one #lightbox and several Lightbox objects share it, so what lets go of the shown content (a file's
// object URL, a playing video) belongs to the page too.
let releaseShown: (() => void) | null = null;

// Full-window viewer on a 70% dark backdrop: an image, or a file's own panel (player, PDF, path). Clicking the
// backdrop (or Esc) closes it.
export class Lightbox {
  private readonly root: HTMLElement = requireElement('#lightbox');
  private readonly image: HTMLImageElement = requireElement('#lightbox-image');
  private readonly panel: HTMLElement = this.root.querySelector<HTMLElement>(`.${PANEL_CLASS}`) ?? this.createPanel();
  private readonly gallery: LightboxGallery = LightboxGallery.on(this.root, this.image, (): void => this.close());

  constructor() {
    this.root.addEventListener('click', (event: MouseEvent): void => {
      if (event.target === this.root) this.close();
    });
    document.addEventListener('keydown', (event: KeyboardEvent): void => {
      if (event.key === CLOSE_KEY && this.isOpen) {
        event.stopPropagation();
        this.close();
      }
    }, true);
    document.addEventListener('keydown', (event: KeyboardEvent): void => this.takeSpace(event), true);
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  open(source: string): void {
    this.showImage();
    this.image.src = source;
  }

  // A message's pictures, opened at the one clicked (or on the grid of them all): arrows step through them.
  openGallery(images: readonly ImageLoader[], index: number, startsInGrid: boolean = false): void {
    this.showImage();
    this.gallery.start(images, index, startsInGrid);
  }

  // Shows a panel of its own; release runs once when it closes (or another view replaces it).
  openContent(content: HTMLElement, release: () => void): void {
    this.releaseContent();
    this.gallery.end();
    this.image.hidden = true;
    this.image.removeAttribute('src');
    this.panel.replaceChildren(content);
    this.panel.hidden = false;
    this.root.hidden = false;
    releaseShown = release;
  }

  close(): void {
    this.root.hidden = true;
    this.image.removeAttribute('src');
    this.gallery.end();
    this.releaseContent();
  }

  private showImage(): void {
    this.releaseContent();
    this.gallery.end();
    this.panel.hidden = true;
    this.image.hidden = false;
    this.root.hidden = false;
  }

  private releaseContent(): void {
    const release: (() => void) | null = releaseShown;
    releaseShown = null;
    this.panel.replaceChildren();
    release?.();
  }

  // Space would start dictation behind the viewer; over a player it plays or pauses instead.
  private takeSpace(event: KeyboardEvent): void {
    if (event.key !== PLAY_KEY || !this.isOpen || this.panel.hidden) return;
    event.preventDefault();
    // Every Lightbox listens; the first one alone toggles the player.
    event.stopImmediatePropagation();
    if (event.repeat) return;
    const media: HTMLMediaElement | null = this.panel.querySelector<HTMLMediaElement>(MEDIA_SELECTOR);
    if (media === null) return;
    if (media.paused) void media.play().catch((): void => undefined);
    else media.pause();
  }

  private createPanel(): HTMLElement {
    const panel: HTMLElement = element('div', PANEL_CLASS);
    panel.hidden = true;
    this.root.append(panel);
    return panel;
  }
}
