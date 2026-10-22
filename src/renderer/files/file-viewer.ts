import { KIND_LABELS } from '../../shared/attachment-kinds';
import { element } from '../dom';
import type { Lightbox } from '../lightbox';
import { FILE_KIND_ICONS } from './file-icons';
import { renderPathRow } from './file-path-row';
import type { FileSource } from './file-source';
import { loadFileSource } from './file-source';
import { renderNotice, renderPlayer, stopPlayers } from './file-stage';
import type { FileView, PlayableKind } from './file-view';
import { playableKind } from './file-view';

const LOADING_TEXT: string = 'Loading…';
const NOT_SERVED_TEXT: string = 'Only files sent from Orbit (and not too large) open here. Its path is below.';

// Opens a file from a message in the lightbox: a video or audio player, a PDF, or for anything else its path.
export class FileViewer {
  constructor(private readonly lightbox: Lightbox) {}

  open(view: FileView): void {
    const panel: HTMLDivElement = element('div', 'file-viewer');
    const stage: HTMLDivElement = element('div', 'file-viewer-stage');
    const kind: PlayableKind | null = playableKind(view.kind);
    let source: FileSource | null = null;
    let isClosed: boolean = false;
    panel.append(renderHeader(view), ...(kind === null ? [] : [stage]), renderPathRow(view));
    this.lightbox.openContent(panel, (): void => {
      isClosed = true;
      stopPlayers(stage);
      releaseSource(source);
    });
    if (kind === null) return;
    stage.replaceChildren(renderNotice(LOADING_TEXT));
    void loadFileSource(view).then((loaded: FileSource | null): void => {
      // Closed while loading: nothing will show it.
      if (isClosed) return releaseSource(loaded);
      source = loaded;
      stage.replaceChildren(...(loaded === null ? [renderNotice(NOT_SERVED_TEXT)] : renderPlayer(kind, loaded.url)));
    });
  }
}

function renderHeader(view: FileView): HTMLElement {
  const header: HTMLDivElement = element('div', 'file-viewer-header');
  const icon: HTMLSpanElement = element('span', 'file-viewer-icon');
  icon.innerHTML = FILE_KIND_ICONS[view.kind];
  header.append(icon, element('span', 'file-viewer-name', view.name), element('span', 'file-viewer-kind', KIND_LABELS[view.kind]));
  return header;
}

function releaseSource(source: FileSource | null): void {
  if (source?.isOwned === true) URL.revokeObjectURL(source.url);
}
