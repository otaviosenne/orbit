export const SVG_NS: 'http://www.w3.org/2000/svg' = 'http://www.w3.org/2000/svg';
export const WIDTH: number = 640;
export const HEIGHT: number = 230;
export const PLOT_LEFT: number = 38;
export const PLOT_RIGHT: number = 12;
export const PLOT_TOP: number = 12;
export const PLOT_BOTTOM: number = 30;
export const FULL_PERCENT: number = 100;

export function xOf(fraction: number): number {
  return PLOT_LEFT + fraction * (WIDTH - PLOT_LEFT - PLOT_RIGHT);
}

export function yOf(percent: number): number {
  return PLOT_TOP + (1 - Math.min(percent, FULL_PERCENT) / FULL_PERCENT) * (HEIGHT - PLOT_TOP - PLOT_BOTTOM);
}

// The way back from a position in the drawing to how far along the week it is; null outside the plot.
export function fractionAt(svgX: number): number | null {
  const fraction: number = (svgX - PLOT_LEFT) / (WIDTH - PLOT_LEFT - PLOT_RIGHT);
  return fraction < 0 || fraction > 1 ? null : fraction;
}

export function shape(tag: string, attributes: Record<string, string | number>): SVGElement {
  const node: SVGElement = document.createElementNS(SVG_NS, tag) as SVGElement;
  Object.entries(attributes).forEach(([name, value]: [string, string | number]): void => node.setAttribute(name, String(value)));
  return node;
}
