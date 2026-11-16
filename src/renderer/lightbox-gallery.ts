import { element } from './dom';
import type { GalleryStep } from './gallery-steps';
import type { GridShape } from './gallery-steps';
import { counterText, gridShape, steppedIndex, swipeStep, totalText } from './gallery-steps';
import { CARET_LEFT_ICON, CARET_RIGHT_ICON, GRID_ICON } from './icons';

// Resolves one picture's pixels: already shown thumbnails answer at once, others are fetched by key.
export type ImageLoader = () => Promise<string | null>;

const PREVIOUS_KEY: string = 'ArrowLeft';
const NEXT_KEY: string = 'ArrowRight';
const CURRENT_CLASS: string = 'is-current';
// Matches the phone layout in attachments.css, where the arrows float over the picture.
const NARROW_QUERY: string = '(max-width: 699px)';
const NARROW_MAX_COLUMNS: number = 2;
const WIDE_MAX_COLUMNS: number = 4;

// Steps through the pictures of one message inside the lightbox (arrows, keys, swipe) or lays them all out in a
// grid. The page has one #lightbox, so every Lightbox shares this one gallery and its controls.
export class LightboxGallery {
  private static shared: LightboxGallery | null = null;

  private images: readonly ImageLoader[] = [];
  private index: number = 0;
  private isActive: boolean = false;
  private showsGrid: boolean = false;
  // Only the newest load may paint the big picture, so a slow fetch never replaces the one stepped to since.
  private loadTurn: number = 0;
  private swipeStartX: number | null = null;
  private readonly controls: HTMLElement = element('div', 'lightbox-gallery');
  private readonly counter: HTMLElement = element('span', 'lightbox-counter');
  private readonly gridToggle: HTMLButtonElement = iconButton('lightbox-grid-toggle', GRID_ICON, 'Show all images');
  private readonly previous: HTMLButtonElement = iconButton('lightbox-nav is-previous', CARET_LEFT_ICON, 'Previous image');
  private readonly next: HTMLButtonElement = iconButton('lightbox-nav is-next', CARET_RIGHT_ICON, 'Next image');
  private readonly grid: HTMLElement = element('div', 'lightbox-grid');

  static on(root: HTMLElement, image: HTMLImageElement, close: () => void): LightboxGallery {
    LightboxGallery.shared ??= new LightboxGallery(root, image, close);
    return LightboxGallery.shared;
  }

  private constructor(private readonly root: HTMLElement, private readonly image: HTMLImageElement, private readonly close: () => void) {
    const bar: HTMLElement = element('div', 'lightbox-bar');
    bar.append(this.counter, this.gridToggle);
    this.controls.append(bar, this.previous, this.next, this.grid);
    this.controls.hidden = true;
    root.append(this.controls);
    this.listen();
  }

  // Opens on one picture, or straight on the grid when the message's grid button asked for all of them.
  start(images: readonly ImageLoader[], index: number, startsInGrid: boolean): void {
    this.images = images;
    this.isActive = true;
    this.controls.hidden = images.length < 2;
    this.index = steppedIndex(index, 0, images.length);
    this.setGrid(startsInGrid && images.length > 1);
    if (!this.showsGrid) this.show(this.index);
  }

  end(): void {
    this.isActive = false;
    this.loadTurn += 1;
    this.controls.hidden = true;
    this.grid.replaceChildren();
  }

  private listen(): void {
    this.previous.addEventListener('click', (): void => this.step(-1));
    this.next.addEventListener('click', (): void => this.step(1));
    this.gridToggle.addEventListener('click', (): void => this.toggleGrid());
    // The grid's gaps are backdrop too.
    this.grid.addEventListener('click', (event: MouseEvent): void => {
      if (event.target === this.grid) this.close();
    });
    document.addEventListener('keydown', (event: KeyboardEvent): void => this.takeArrow(event), true);
    this.image.addEventListener('pointerdown', (event: PointerEvent): void => {
      this.swipeStartX = event.clientX;
    });
    this.image.addEventListener('pointerup', (event: PointerEvent): void => this.endSwipe(event.clientX));
  }

  private get isBrowsing(): boolean {
    return this.isActive && !this.root.hidden && this.images.length > 1 && !this.showsGrid;
  }

  private show(index: number): void {
    this.index = steppedIndex(index, 0, this.images.length);
    this.counter.textContent = counterText(this.index, this.images.length);
    this.previous.disabled = this.index === 0;
    this.next.disabled = this.index === this.images.length - 1;
    const turn: number = ++this.loadTurn;
    this.image.removeAttribute('src');
    void this.images[this.index]?.().then((source: string | null): void => {
      if (source !== null && turn === this.loadTurn) this.image.src = source;
    });
  }

  private step(step: GalleryStep): void {
    if (step !== 0) this.show(steppedIndex(this.index, step, this.images.length));
  }

  // The arrows would move the composer's caret or the board's focus behind the viewer.
  private takeArrow(event: KeyboardEvent): void {
    if (!this.isBrowsing || (event.key !== PREVIOUS_KEY && event.key !== NEXT_KEY)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    this.step(event.key === NEXT_KEY ? 1 : -1);
  }

  private endSwipe(endX: number): void {
    const startX: number | null = this.swipeStartX;
    this.swipeStartX = null;
    if (startX !== null && this.isBrowsing) this.step(swipeStep(endX - startX));
  }

  private toggleGrid(): void {
    this.setGrid(!this.showsGrid);
    if (!this.showsGrid) this.show(this.index);
  }

  private setGrid(showsGrid: boolean): void {
    this.showsGrid = showsGrid;
    this.image.hidden = showsGrid;
    this.grid.hidden = !showsGrid;
    this.previous.hidden = showsGrid;
    this.next.hidden = showsGrid;
    this.counter.textContent = showsGrid ? totalText(this.images.length) : counterText(this.index, this.images.length);
    this.gridToggle.setAttribute('aria-pressed', String(showsGrid));
    this.grid.replaceChildren(...(showsGrid ? this.images.map((load: ImageLoader, index: number) => this.gridCell(load, index)) : []));
    if (showsGrid) this.shapeGrid();
  }

  private shapeGrid(): void {
    const maxColumns: number = window.matchMedia(NARROW_QUERY).matches ? NARROW_MAX_COLUMNS : WIDE_MAX_COLUMNS;
    const shape: GridShape = gridShape(this.images.length, maxColumns);
    this.grid.style.setProperty('--grid-columns', String(shape.columns));
    this.grid.style.setProperty('--grid-rows', String(shape.rows));
  }

  private gridCell(load: ImageLoader, index: number): HTMLElement {
    const cell: HTMLButtonElement = element('button', `lightbox-grid-cell${index === this.index ? ` ${CURRENT_CLASS}` : ''}`);
    cell.type = 'button';
    cell.setAttribute('aria-label', `Open image ${index + 1}`);
    const picture: HTMLImageElement = element('img', 'lightbox-grid-picture');
    picture.alt = '';
    picture.draggable = false;
    cell.append(picture);
    void load().then((source: string | null): void => {
      if (source !== null) picture.src = source;
    });
    cell.addEventListener('click', (): void => {
      this.setGrid(false);
      this.show(index);
    });
    return cell;
  }
}

function iconButton(className: string, icon: string, label: string): HTMLButtonElement {
  const button: HTMLButtonElement = element('button', className);
  button.type = 'button';
  button.setAttribute('aria-label', label);
  button.title = label;
  // Bundled Phosphor markup, never user content.
  button.innerHTML = icon;
  return button;
}
