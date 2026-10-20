import { copyTextLayout, TEXT_LAYOUT_PROPERTIES } from './text-layout';

// A textarea does not expose where its caret is drawn; a hidden copy with the same text layout does.
const MIRRORED_PROPERTIES: readonly string[] = [...TEXT_LAYOUT_PROPERTIES, 'width'];

export interface CaretPoint {
  readonly top: number;
  readonly left: number;
  readonly height: number;
}

// Where the caret at `position` sits, relative to the textarea's top-left corner.
export function caretPoint(textarea: HTMLTextAreaElement, position: number): CaretPoint {
  const style: CSSStyleDeclaration = getComputedStyle(textarea);
  const mirror: HTMLDivElement = document.createElement('div');
  copyTextLayout(style, mirror, MIRRORED_PROPERTIES);
  Object.assign(mirror.style, { position: 'absolute', visibility: 'hidden', top: '0', left: '0', whiteSpace: 'pre-wrap', overflowWrap: 'break-word' });
  mirror.textContent = textarea.value.slice(0, position);
  const marker: HTMLSpanElement = document.createElement('span');
  // The marker needs content to have a position; a zero-width space does not change the layout.
  marker.textContent = '​';
  mirror.append(marker);
  document.body.append(mirror);
  const point: CaretPoint = {
    top: marker.offsetTop - textarea.scrollTop,
    left: marker.offsetLeft - textarea.scrollLeft,
    height: parseFloat(style.lineHeight),
  };
  mirror.remove();
  return point;
}
