import type { AttachmentUpload } from '../../shared/types';
import { element } from '../dom';
import { CLOSE_ICON } from '../icons';
import type { Lightbox } from '../lightbox';

interface Attachment {
  readonly id: number;
  readonly file: File;
  readonly url: string;
}

const IMAGE_TYPE_PREFIX: string = 'image/';

// Tells the composer when the user changes the images from the tray, so the draft's markers follow.
export interface TrayChanges {
  removed(index: number): void;
  // order[newIndex] is the image's index before the move.
  reordered(order: readonly number[]): void;
}

// Images waiting to be sent, shown as rounded thumbnails above the text (ChatGPT style).
// Drag a thumbnail to reorder, × to remove, click to view it large.
export class AttachmentTray {
  private attachments: Attachment[] = [];
  private nextId: number = 0;
  private draggedId: number | null = null;

  constructor(private readonly root: HTMLElement, private readonly lightbox: Lightbox, private readonly changes: TrayChanges) {
    this.render();
  }

  get count(): number {
    return this.attachments.length;
  }

  // Returns how many of the files were images and were added.
  add(files: Iterable<File>): number {
    const before: number = this.attachments.length;
    for (const file of files) {
      if (!file.type.startsWith(IMAGE_TYPE_PREFIX)) continue;
      this.attachments.push({ id: this.nextId++, file, url: URL.createObjectURL(file) });
    }
    this.render();
    return this.attachments.length - before;
  }

  // Keeps only the images at these indexes, in their current order; the draft already dropped the others' markers.
  keep(indexes: ReadonlySet<number>): void {
    const dropped: Attachment[] = this.attachments.filter((_attachment: Attachment, index: number) => !indexes.has(index));
    for (const attachment of dropped) URL.revokeObjectURL(attachment.url);
    this.attachments = this.attachments.filter((_attachment: Attachment, index: number) => indexes.has(index));
    this.render();
  }

  // Shows the image at this index large; a marker typed by hand may point at no image, and then nothing opens.
  preview(index: number): void {
    const attachment: Attachment | undefined = this.attachments[index];
    if (attachment !== undefined) this.lightbox.open(attachment.url);
  }

  files(): File[] {
    return this.attachments.map((attachment: Attachment) => attachment.file);
  }

  async uploads(): Promise<AttachmentUpload[]> {
    return Promise.all(
      this.attachments.map(async (attachment: Attachment): Promise<AttachmentUpload> => ({
        name: attachment.file.name,
        mediaType: attachment.file.type,
        bytes: new Uint8Array(await attachment.file.arrayBuffer()),
      })),
    );
  }

  clear(): void {
    for (const attachment of this.attachments) URL.revokeObjectURL(attachment.url);
    this.attachments = [];
    this.render();
  }

  private remove(id: number): void {
    const index: number = this.attachments.findIndex((attachment: Attachment) => attachment.id === id);
    const removed: Attachment | undefined = this.attachments[index];
    if (removed === undefined) return;
    URL.revokeObjectURL(removed.url);
    this.attachments = this.attachments.filter((attachment: Attachment) => attachment.id !== id);
    this.render();
    this.changes.removed(index);
  }

  private moveBefore(draggedId: number, targetId: number): void {
    const dragged: Attachment | undefined = this.attachments.find((attachment: Attachment) => attachment.id === draggedId);
    if (dragged === undefined || draggedId === targetId) return;
    const rest: Attachment[] = this.attachments.filter((attachment: Attachment) => attachment.id !== draggedId);
    const index: number = rest.findIndex((attachment: Attachment) => attachment.id === targetId);
    rest.splice(index, 0, dragged);
    const previous: Attachment[] = this.attachments;
    this.attachments = rest;
    this.render();
    this.changes.reordered(rest.map((attachment: Attachment) => previous.indexOf(attachment)));
  }

  private render(): void {
    this.root.hidden = this.attachments.length === 0;
    this.root.replaceChildren(...this.attachments.map((attachment: Attachment) => this.renderThumb(attachment)));
  }

  private renderThumb(attachment: Attachment): HTMLElement {
    const thumb: HTMLDivElement = element('div', 'attachment');
    thumb.draggable = true;
    const image: HTMLImageElement = element('img', 'attachment-image');
    image.src = attachment.url;
    image.alt = attachment.file.name;
    image.draggable = false;
    const remove: HTMLButtonElement = element('button', 'attachment-remove');
    remove.type = 'button';
    remove.setAttribute('aria-label', 'Remove image');
    remove.innerHTML = CLOSE_ICON;
    remove.addEventListener('click', (event: MouseEvent): void => {
      event.stopPropagation();
      this.remove(attachment.id);
    });
    thumb.append(image, remove);
    thumb.addEventListener('click', (): void => this.lightbox.open(attachment.url));
    thumb.addEventListener('dragstart', (): void => {
      this.draggedId = attachment.id;
    });
    thumb.addEventListener('dragover', (event: DragEvent): void => event.preventDefault());
    thumb.addEventListener('drop', (event: DragEvent): void => {
      event.preventDefault();
      event.stopPropagation();
      if (this.draggedId !== null) this.moveBefore(this.draggedId, attachment.id);
      this.draggedId = null;
    });
    return thumb;
  }
}
