import { isTextField } from '../../renderer/sheet/space-to-talk';
import type { ViewportBox } from './viewport-box';
import { chatViewportBox } from './viewport-box';

// iOS Safari keeps the layout viewport when the keyboard opens; the visual viewport is what is left above it, so the
// full-screen chat sizes itself to this and its composer stays right above the keyboard.
const HEIGHT_PROPERTY: string = '--web-viewport-height';
const TOP_PROPERTY: string = '--web-viewport-top';

export function trackViewportHeight(): void {
  const viewport: VisualViewport | null = window.visualViewport;
  if (viewport === null) return;
  const apply = (): void => applyBox(chatViewportBox(viewport, isTextField(document.activeElement)));
  viewport.addEventListener('resize', apply);
  viewport.addEventListener('scroll', apply);
  // Focus moves before the keyboard has finished moving; the viewport events that follow correct the size.
  document.addEventListener('focusin', apply);
  document.addEventListener('focusout', (): void => void window.requestAnimationFrame(apply));
  apply();
}

function applyBox(box: ViewportBox | null): void {
  const style: CSSStyleDeclaration = document.documentElement.style;
  if (box === null) {
    style.removeProperty(HEIGHT_PROPERTY);
    style.removeProperty(TOP_PROPERTY);
    return;
  }
  style.setProperty(HEIGHT_PROPERTY, `${box.height}px`);
  style.setProperty(TOP_PROPERTY, `${box.top}px`);
}
