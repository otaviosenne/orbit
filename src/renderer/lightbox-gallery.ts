import { element } from './dom';
import { DragScroll } from './drag-scroll';
import type { GalleryLayout, GalleryStep, GridShape, RowEnds } from './gallery-steps';
import { counterText, gridShape, nextLayout, rowEnds, steppedIndex, swipeStep, totalText } from './gallery-steps';
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
const ROW_CLASS: string = 'is-row';
// An arrow (key or button) moves the row by most of a screen, keeping a sliver of the last view for orientation.
const ROW_ARROW_SCROLL_SHARE: number = 0.8;
const BACK_LABEL: string = 'Back to all images';
// The toggle names what the next press does, since one button walks through all three layouts.
const TOGGLE_LABELS: Readonly<Record<GalleryLayout, string>> = {
  single: 'Show all images',
  grid: 'Show all images in a row',
  row: 'Show one image',
};

interface ScrollSpot {
  readonly left: number;
  readonly top: number;
}

// Steps through the pictures of one message inside the lightbox (arrows, keys, swipe) or lays them all out in a
// grid or a row. The page has one #lightbox, so every Lightbox shares this one gallery and its controls.
export class LightboxGallery {
  private static shared: LightboxGallery | null = null;

  private images: readonly ImageLoader[] = [];
  private index: number = 0;
  private isActive: boolean = false;
  private layout: GalleryLayout = 'single';
  // The grid or row a picture was opened from, kept rendered so leaving the picture returns to the same spot.
  private overview: GalleryLayout | null = null;
  private overviewSpot: ScrollSpot = { left: 0, top: 0 };
  // Only the newest load may paint the big picture, so a slow fetch never replaces the one stepped to since.
  private loadTurn: number = 0;
  private swipeStartX: number | null = null;
  private readonly controls: HTMLElement = element('div', 'lightbox-gallery');
  private readonly counter: HTMLElement = element('span', 'lightbox-counter');
  private readonly gridToggle: HTMLButtonElement = iconButton('lightbox-grid-toggle', GRID_ICON, TOGGLE_LABELS.single);
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
    new DragScroll(this.grid, (): boolean => this.layout === 'row');
  }

  // Opens on one picture, or straight on the grid when the message's grid button asked for all of them.
  start(images: readonly ImageLoader[], index: number, startsInGrid: boolean): void {
    this.images = images;
    this.isActive = true;
    this.controls.hidden = images.length < 2;
    this.index = steppedIndex(index, 0, images.length);
    this.setLayout(startsInGrid && images.length > 1 ? 'grid' : 'single');
    if (this.layout === 'single') this.show(this.index);
  }

  end(): void {
    this.isActive = false;
    this.loadTurn += 1;
    this.overview = null;
    this.controls.hidden = true;
    this.grid.replaceChildren();
  }

  private listen(): void {
    this.previous.addEventListener('click', (): void => this.move(-1));
    this.next.addEventListener('click', (): void => this.move(1));
    this.grid.addEventListener('scroll', (): void => this.markRowEnds());
    this.gridToggle.addEventListener('click', (): void => this.cycleLayout());
    // The grid's gaps are backdrop too.
    this.grid.addEventListener('click', (event: MouseEvent): void => {
      if (event.target === this.grid) this.close();
    });
    // A mouse wheel only scrolls up and down, so in the row it moves the pictures sideways instead.
    this.grid.addEventListener('wheel', (event: WheelEvent): void => this.scrollRow(event), { passive: false });
    document.addEventListener('keydown', (event: KeyboardEvent): void => this.takeArrow(event), true);
    this.image.addEventListener('pointerdown', (event: PointerEvent): void => {
      this.swipeStartX = event.clientX;
    });
    this.image.addEventListener('pointerup', (event: PointerEvent): void => this.endSwipe(event.clientX));
  }

  private get isBrowsing(): boolean {
    return this.isOpen && this.layout === 'single';
  }

  private get isOpen(): boolean {
    return this.isActive && !this.root.hidden && this.images.length > 1;
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
    if (!this.isOpen || this.layout === 'grid' || (event.key !== PREVIOUS_KEY && event.key !== NEXT_KEY)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    this.move(event.key === NEXT_KEY ? 1 : -1);
  }

  // In the row the arrows pan it; on one picture they step to the next.
  private move(step: GalleryStep): void {
    if (this.layout === 'row') this.grid.scrollBy({ left: step * this.grid.clientWidth * ROW_ARROW_SCROLL_SHARE, behavior: 'smooth' });
    else this.step(step);
  }

  private markRowEnds(): void {
    if (this.layout !== 'row') return;
    const ends: RowEnds = rowEnds(this.grid.scrollLeft, this.grid.clientWidth, this.grid.scrollWidth);
    this.previous.disabled = ends.atStart;
    this.next.disabled = ends.atEnd;
  }

  private scrollRow(event: WheelEvent): void {
    if (this.layout !== 'row' || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    event.preventDefault();
    this.grid.scrollLeft += event.deltaY;
  }

  private endSwipe(endX: number): void {
    const startX: number | null = this.swipeStartX;
    this.swipeStartX = null;
    if (startX !== null && this.isBrowsing) this.step(swipeStep(endX - startX));
  }

  private cycleLayout(): void {
    if (this.returnToOverview()) return;
    this.setLayout(nextLayout(this.layout));
    if (this.layout === 'single') this.show(this.index);
  }

  // A picture opened from the grid or row goes back there (same layout, same scroll) instead of closing the viewer.
  returnToOverview(): boolean {
    const overview: GalleryLayout | null = this.overview;
    if (!this.isActive || this.layout !== 'single' || overview === null) return false;
    this.overview = null;
    this.display(overview);
    for (const [index, cell] of [...this.grid.children].entries()) cell.classList.toggle(CURRENT_CLASS, index === this.index);
    this.grid.scrollTo(this.overviewSpot);
    this.markRowEnds();
    return true;
  }

  private maximize(index: number): void {
    this.overview = this.layout;
    this.overviewSpot = { left: this.grid.scrollLeft, top: this.grid.scrollTop };
    this.display('single');
    this.show(index);
  }

  // Lays the pictures out afresh, at the start of the layout.
  private setLayout(layout: GalleryLayout): void {
    this.overview = null;
    this.display(layout);
    this.grid.replaceChildren(...(layout === 'single' ? [] : this.images.map((load: ImageLoader, index: number) => this.gridCell(load, index))));
    this.grid.scrollTo({ left: 0, top: 0 });
    if (layout === 'grid') this.shapeGrid();
    this.markRowEnds();
  }

  // Which view and controls show; the laid-out pictures themselves stay as they are.
  private display(layout: GalleryLayout): void {
    this.layout = layout;
    const showsAll: boolean = layout !== 'single';
    this.image.hidden = showsAll;
    this.grid.hidden = !showsAll;
    this.grid.classList.toggle(ROW_CLASS, layout === 'row');
    this.previous.hidden = layout === 'grid';
    this.next.hidden = layout === 'grid';
    this.counter.textContent = showsAll ? totalText(this.images.length) : counterText(this.index, this.images.length);
    this.gridToggle.setAttribute('aria-pressed', String(showsAll));
    const label: string = this.overview === null ? TOGGLE_LABELS[layout] : BACK_LABEL;
    this.gridToggle.setAttribute('aria-label', label);
    this.gridToggle.title = label;
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
    // A picture's width is only known once it loads, and it moves where the row ends.
    picture.addEventListener('load', (): void => this.markRowEnds(), { once: true });
    // In the row the open picture may sit past the screen's edge; its width is only known once it has loaded.
    if (index === this.index && this.layout === 'row') {
      picture.addEventListener('load', (): void => cell.scrollIntoView({ inline: 'center', block: 'nearest' }), { once: true });
    }
    cell.addEventListener('click', (): void => this.maximize(index));
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
