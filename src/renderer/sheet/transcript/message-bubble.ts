import { imageTokenPattern } from '../../../shared/image-tokens';
import type { MessageImage, MessageItem, MessageRole } from '../../../shared/types';
import { element } from '../../dom';
import { formatClock } from '../../format';
import { renderMarkdown } from '../../markdown';
import type { PendingMessage } from '../pending-messages';
import { linkFileChips } from './file-chips';
import type { MessageFiles } from './message-files';
import { pendingFiles, transcriptFiles } from './message-files';
import type { ImageLookup, ThumbnailSource } from './message-thumbnails';
import { IMAGE_KEY_ATTRIBUTE, renderThumbnails, transcriptThumbnails } from './message-thumbnails';

const ROLE_LABELS: Readonly<Record<MessageRole, string>> = { user: 'You', assistant: 'Claude' };


// A message just sent from the panel, shown before the chat's transcript confirms it.
export function renderPendingMessage(message: PendingMessage): HTMLElement {
  const item: HTMLElement = element('div', `message message-user${message.delivered ? '' : ' is-pending'}`);
  const body: HTMLDivElement = element('div', 'message-text markdown');
  const files: MessageFiles = pendingFiles(message.text, message.attachments);
  renderMarkdown(body, files.text);
  linkImages(body, []);
  linkFileChips(body, files.chips);
  const thumbnails: ThumbnailSource[] = message.imageUrls.map((url: string): ThumbnailSource => ({ source: url }));
  item.append(element('span', 'message-meta', pendingMeta(message)), ...thumbnailRow(thumbnails), body);
  return item;
}

function thumbnailRow(thumbnails: readonly ThumbnailSource[]): HTMLElement[] {
  return thumbnails.length === 0 ? [] : [renderThumbnails(thumbnails)];
}

// Once delivered it reads like any sent message, since a busy chat may not log it for minutes.
function pendingMeta(message: PendingMessage): string {
  return message.delivered ? `${ROLE_LABELS.user} · ${formatClock(message.sentAt)}` : 'Sending…';
}

// Turns each "[Image #N]" Claude Code wrote into a chip that opens that image; unknown numbers stay inert.
function linkImages(body: HTMLElement, images: readonly MessageImage[]): void {
  const walker: TreeWalker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  for (let node: Node | null = walker.nextNode(); node !== null; node = walker.nextNode()) textNodes.push(node as Text);
  for (const node of textNodes) {
    const text: string = node.data;
    if (!imageTokenPattern().test(text)) continue;
    const parts: Node[] = [];
    let cursor: number = 0;
    for (const match of text.matchAll(imageTokenPattern())) {
      parts.push(document.createTextNode(text.slice(cursor, match.index)));
      parts.push(imageChip(Number(match[1]), images));
      cursor = (match.index ?? 0) + match[0].length;
    }
    parts.push(document.createTextNode(text.slice(cursor)));
    node.replaceWith(...parts);
  }
}

function imageChip(number: number, images: readonly MessageImage[]): HTMLElement {
  const image: MessageImage | undefined = images.find((candidate: MessageImage) => candidate.number === number);
  const chip: HTMLButtonElement = element('button', `image-chip${image === undefined ? ' is-inert' : ''}`, `Image #${number}`);
  chip.type = 'button';
  if (image !== undefined) chip.dataset[IMAGE_KEY_ATTRIBUTE] = image.key;
  return chip;
}

export function renderMessage(message: MessageItem, lookup: ImageLookup): HTMLElement {
  const item: HTMLElement = element('div', `message message-${message.role}`);
  const body: HTMLDivElement = element('div', 'message-text markdown');
  const isUser: boolean = message.role === 'user';
  // Files sent from the composer reach Claude as paths; the user's own bubble shows them as chips again.
  const files: MessageFiles | null = isUser ? transcriptFiles(message.text) : null;
  renderMarkdown(body, files?.text ?? message.text);
  if (isUser) linkImages(body, message.images);
  if (files !== null) linkFileChips(body, files.chips);
  const thumbnails: ThumbnailSource[] = isUser ? transcriptThumbnails(message.images, lookup) : [];
  item.append(element('span', 'message-meta', `${ROLE_LABELS[message.role]} · ${formatClock(message.timestamp)}`), ...thumbnailRow(thumbnails), body);
  return item;
}
