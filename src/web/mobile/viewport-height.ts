// iOS Safari keeps the layout viewport when the keyboard opens; the visual viewport is what is left above it, so the
// full-screen chat sizes itself to this and its composer stays right above the keyboard.
const HEIGHT_PROPERTY: string = '--web-viewport-height';
const TOP_PROPERTY: string = '--web-viewport-top';

export function trackViewportHeight(): void {
  const viewport: VisualViewport | null = window.visualViewport;
  if (viewport === null) return;
  const apply = (): void => {
    document.documentElement.style.setProperty(HEIGHT_PROPERTY, `${viewport.height}px`);
    document.documentElement.style.setProperty(TOP_PROPERTY, `${viewport.offsetTop}px`);
  };
  viewport.addEventListener('resize', apply);
  viewport.addEventListener('scroll', apply);
  apply();
}
