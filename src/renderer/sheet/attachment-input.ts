import { ATTACH_ICON } from '../files/file-icons';
import type { AttachmentMarkers } from './attachment-markers';
import type { AttachmentTray } from './attachment-tray';
import { attachmentLimitBytes, withinLimit } from './attachment-limit';
import type { LimitedFiles } from './attachment-limit';
import { AtomicMarkers } from './atomic-markers';
import { MarkerChipClicks } from './marker-chip-clicks';
import { MarkerHighlight } from './marker-highlight';

// The parts of a composer that take files in.
export interface AttachmentInputElements {
  // Files dropped anywhere on it are attached.
  readonly host: HTMLElement;
  readonly input: HTMLTextAreaElement;
  // Paints the draft behind the transparent textarea, with each marker as a chip.
  readonly layer: HTMLElement;
  readonly attach: HTMLButtonElement;
  readonly picker: HTMLInputElement;
}

export type AttachmentProblem = (message: string) => void;

const ATTACH_LABEL: string = 'Attach files';

// Any file comes in by pasting, dropping it on the composer, or the paperclip; each gets its marker at the caret.
// The markers draw as chips the caret steps over, and clicking one opens its attachment.
export function wireAttachmentInput(elements: AttachmentInputElements, markers: AttachmentMarkers, tray: AttachmentTray, onProblem: AttachmentProblem): void {
  const attach = (files: readonly File[]): void => attachWithinLimit(files, markers, tray, onProblem);
  wirePicker(elements, attach);
  elements.input.addEventListener('paste', (event: ClipboardEvent): void => {
    const files: File[] = [...(event.clipboardData?.files ?? [])];
    if (files.length === 0) return;
    event.preventDefault();
    attach(files);
  });
  elements.host.addEventListener('dragover', (event: DragEvent): void => event.preventDefault());
  elements.host.addEventListener('drop', (event: DragEvent): void => {
    const files: File[] = [...(event.dataTransfer?.files ?? [])];
    if (files.length === 0) return;
    event.preventDefault();
    attach(files);
  });
  const highlight: MarkerHighlight = new MarkerHighlight(elements.input, elements.layer);
  new AtomicMarkers(elements.input);
  new MarkerChipClicks(elements.input, highlight, (number: number): void => tray.preview(number - 1));
}

function wirePicker(elements: AttachmentInputElements, attach: (files: readonly File[]) => void): void {
  elements.attach.innerHTML = ATTACH_ICON;
  elements.attach.setAttribute('aria-label', ATTACH_LABEL);
  elements.attach.title = ATTACH_LABEL;
  elements.attach.addEventListener('mousedown', (event: MouseEvent): void => event.preventDefault());
  elements.attach.addEventListener('click', (): void => elements.picker.click());
  elements.picker.addEventListener('change', (): void => {
    attach([...(elements.picker.files ?? [])]);
    elements.picker.value = '';
    elements.input.focus();
  });
}

function attachWithinLimit(files: readonly File[], markers: AttachmentMarkers, tray: AttachmentTray, onProblem: AttachmentProblem): void {
  const limited: LimitedFiles = withinLimit(files, tray.totalBytes, attachmentLimitBytes());
  if (limited.problem !== null) onProblem(limited.problem);
  markers.attach(limited.accepted);
}
