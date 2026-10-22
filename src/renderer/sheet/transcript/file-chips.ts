import type { AttachmentKind } from '../../../shared/attachment-kinds';
import { element } from '../../dom';
import { FILE_KIND_ICONS } from '../../files/file-icons';
import type { FileView } from '../../files/file-view';
import type { FileChip } from './message-files';
import { placeholderPattern } from './message-files';

export const FILE_CHIP_SELECTOR: string = '.file-chip';
const KIND_ATTRIBUTE: string = 'fileKind';
const NAME_ATTRIBUTE: string = 'fileName';
const PATH_ATTRIBUTE: string = 'filePath';
const LOCAL_URL_ATTRIBUTE: string = 'fileUrl';
const ATTACHMENT_ATTRIBUTE: string = 'fileAttachment';
const ATTACHMENT_FLAG: string = 'true';

// Puts each file's chip where its placeholder sits in the drawn markdown.
export function linkFileChips(body: HTMLElement, chips: readonly FileChip[]): void {
  if (chips.length === 0) return;
  for (const node of textNodes(body)) {
    if (!placeholderPattern().test(node.data)) continue;
    const parts: Node[] = [];
    let cursor: number = 0;
    for (const match of node.data.matchAll(placeholderPattern())) {
      parts.push(document.createTextNode(node.data.slice(cursor, match.index)));
      const chip: FileChip | undefined = chips[Number(match[1])];
      if (chip !== undefined) parts.push(renderFileChip(chip));
      cursor = match.index + match[0].length;
    }
    parts.push(document.createTextNode(node.data.slice(cursor)));
    node.replaceWith(...parts);
  }
}

// What a clicked chip shows in the viewer.
export function fileViewOf(chip: HTMLElement): FileView | null {
  const kind: string | undefined = chip.dataset[KIND_ATTRIBUTE];
  const name: string | undefined = chip.dataset[NAME_ATTRIBUTE];
  if (kind === undefined || name === undefined) return null;
  return {
    kind: kind as AttachmentKind,
    name,
    path: chip.dataset[PATH_ATTRIBUTE] ?? null,
    isAttachment: chip.dataset[ATTACHMENT_ATTRIBUTE] === ATTACHMENT_FLAG,
    localUrl: chip.dataset[LOCAL_URL_ATTRIBUTE] ?? null,
  };
}

function renderFileChip(chip: FileChip): HTMLButtonElement {
  const button: HTMLButtonElement = element('button', 'file-chip');
  button.type = 'button';
  button.title = chip.path ?? chip.name;
  button.dataset[KIND_ATTRIBUTE] = chip.kind;
  button.dataset[NAME_ATTRIBUTE] = chip.name;
  if (chip.path !== null) button.dataset[PATH_ATTRIBUTE] = chip.path;
  if (chip.localUrl !== null) button.dataset[LOCAL_URL_ATTRIBUTE] = chip.localUrl;
  if (chip.isAttachment) button.dataset[ATTACHMENT_ATTRIBUTE] = ATTACHMENT_FLAG;
  const icon: HTMLSpanElement = element('span', 'file-chip-icon');
  icon.innerHTML = FILE_KIND_ICONS[chip.kind];
  button.append(icon, element('span', 'file-chip-name', chip.name));
  return button;
}

function textNodes(root: HTMLElement): Text[] {
  const walker: TreeWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  for (let node: Node | null = walker.nextNode(); node !== null; node = walker.nextNode()) nodes.push(node as Text);
  return nodes;
}
