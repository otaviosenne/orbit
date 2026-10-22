import type { AttachmentKind } from '../../shared/attachment-kinds';
import { attachmentKindOf } from '../../shared/attachment-kinds';
import type { AttachmentUpload } from '../../shared/types';
import { element } from '../dom';
import { FILE_KIND_ICONS } from '../files/file-icons';
import { FileViewer } from '../files/file-viewer';
import { CLOSE_ICON } from '../icons';
import type { Lightbox } from '../lightbox';

interface Attachment {
  readonly id: number;
  readonly file: File;
  readonly url: string;
  readonly kind: AttachmentKind;
}

// Tells the composer when the user changes the attachments from the tray, so the draft's markers follow.
export interface TrayChanges {
  removed(index: number): void;
  // order[newIndex] is the attachment's index before the move.
  reordered(order: readonly number[]): void;
}

// Files waiting to be sent, above the text (ChatGPT style): images as rounded thumbnails, other files as small
// cards with their kind's icon and name. Drag one to reorder, × to remove, click to view it.
export class AttachmentTray {
  private attachments: Attachment[] = [];
  private nextId: number = 0;
  private draggedId: number | null = null;
  private readonly viewer: FileViewer;

  constructor(private readonly root: HTMLElement, private readonly lightbox: Lightbox, private readonly changes: TrayChanges) {
    this.viewer = new FileViewer(lightbox);
    this.render();
  }

  get count(): number {
    return this.attachments.length;
  }

  // What the attachments weigh together, held against the upload limit before more are added.
  get totalBytes(): number {
    return this.attachments.reduce((sum: number, attachment: Attachment) => sum + attachment.file.size, 0);
  }

  // Returns how many files were added.
  add(files: Iterable<File>): number {
    const before: number = this.attachments.length;
    for (const file of files) {
      this.attachments.push({ id: this.nextId++, file, url: URL.createObjectURL(file), kind: attachmentKindOf(file.name, file.type) });
    }
    this.render();
    return this.attachments.length - before;
  }

  // Each attachment's kind, in tray order; its marker in the draft says the same.
  kinds(): AttachmentKind[] {
    return this.attachments.map((attachment: Attachment) => attachment.kind);
  }

  // Keeps only the attachments at these indexes, in their current order; the draft already dropped the others' markers.
  keep(indexes: ReadonlySet<number>): void {
    const dropped: Attachment[] = this.attachments.filter((_attachment: Attachment, index: number) => !indexes.has(index));
    for (const attachment of dropped) URL.revokeObjectURL(attachment.url);
    this.attachments = this.attachments.filter((_attachment: Attachment, index: number) => indexes.has(index));
    this.render();
  }

  // Shows the attachment at this index; a marker typed by hand may point at none, and then nothing opens.
  preview(index: number): void {
    const attachment: Attachment | undefined = this.attachments[index];
    if (attachment !== undefined) this.view(attachment);
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

  private view(attachment: Attachment): void {
    if (attachment.kind === 'image') return this.lightbox.open(attachment.url);
    this.viewer.open({ kind: attachment.kind, name: attachment.file.name, path: null, isAttachment: false, localUrl: attachment.url });
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
    this.root.replaceChildren(...this.attachments.map((attachment: Attachment) => this.renderItem(attachment)));
  }

  private renderItem(attachment: Attachment): HTMLElement {
    const item: HTMLDivElement = element('div', attachment.kind === 'image' ? 'attachment' : 'attachment attachment-file');
    item.draggable = true;
    item.append(attachment.kind === 'image' ? thumbnail(attachment) : fileCard(attachment), this.removeButton(attachment));
    item.addEventListener('click', (): void => this.view(attachment));
    item.addEventListener('dragstart', (): void => {
      this.draggedId = attachment.id;
    });
    item.addEventListener('dragover', (event: DragEvent): void => event.preventDefault());
    item.addEventListener('drop', (event: DragEvent): void => {
      event.preventDefault();
      event.stopPropagation();
      if (this.draggedId !== null) this.moveBefore(this.draggedId, attachment.id);
      this.draggedId = null;
    });
    return item;
  }

  private removeButton(attachment: Attachment): HTMLButtonElement {
    const remove: HTMLButtonElement = element('button', 'attachment-remove');
    remove.type = 'button';
    remove.setAttribute('aria-label', `Remove ${attachment.file.name}`);
    remove.innerHTML = CLOSE_ICON;
    remove.addEventListener('click', (event: MouseEvent): void => {
      event.stopPropagation();
      this.remove(attachment.id);
    });
    return remove;
  }
}

function thumbnail(attachment: Attachment): HTMLImageElement {
  const image: HTMLImageElement = element('img', 'attachment-image');
  image.src = attachment.url;
  image.alt = attachment.file.name;
  image.draggable = false;
  return image;
}

function fileCard(attachment: Attachment): HTMLElement {
  const card: HTMLDivElement = element('div', 'attachment-file-card');
  const icon: HTMLSpanElement = element('span', 'attachment-file-icon');
  icon.innerHTML = FILE_KIND_ICONS[attachment.kind];
  card.title = attachment.file.name;
  card.append(icon, element('span', 'attachment-file-name', attachment.file.name));
  return card;
}
