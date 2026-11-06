import { FULL_VIEW, type PaceView } from './pace-view';

export const SVG_NS: 'http://www.w3.org/2000/svg' = 'http://www.w3.org/2000/svg';
export const WIDTH: number = 640;
export const HEIGHT: number = 230;
export const PLOT_LEFT: number = 38;
export const PLOT_RIGHT: number = 12;
export const PLOT_TOP: number = 12;
export const PLOT_BOTTOM: number = 30;
export const FULL_PERCENT: number = 100;
export const PLOT_WIDTH: number = WIDTH - PLOT_LEFT - PLOT_RIGHT;
export const PLOT_HEIGHT: number = HEIGHT - PLOT_TOP - PLOT_BOTTOM;

// view: the zoomed part of the chart; anything outside it lands off the plot and the plot's clip hides it.
export function xOf(fraction: number, view: PaceView = FULL_VIEW): number {
  return PLOT_LEFT + ((fraction - view.fromX) / (view.toX - view.fromX)) * PLOT_WIDTH;
}

export function yOf(percent: number, view: PaceView = FULL_VIEW): number {
  const share: number = (Math.min(percent, FULL_PERCENT) - view.fromPercent) / (view.toPercent - view.fromPercent);
  return PLOT_TOP + (1 - share) * PLOT_HEIGHT;
}

// The way back from a position in the drawing to how far along the week it is; null outside the plot.
export function fractionAt(svgX: number, view: PaceView = FULL_VIEW): number | null {
  const share: number = (svgX - PLOT_LEFT) / PLOT_WIDTH;
  return share < 0 || share > 1 ? null : view.fromX + share * (view.toX - view.fromX);
}

// Same as fractionAt for both axes, held to the plot's edges so a drag that runs past them still ends on them.
export function clampedPointAt(svgX: number, svgY: number, view: PaceView): { x: number; percent: number } {
  const xShare: number = clampShare((svgX - PLOT_LEFT) / PLOT_WIDTH);
  const yShare: number = clampShare((svgY - PLOT_TOP) / PLOT_HEIGHT);
  return {
    x: view.fromX + xShare * (view.toX - view.fromX),
    percent: view.toPercent - yShare * (view.toPercent - view.fromPercent),
  };
}

function clampShare(share: number): number {
  return Math.min(Math.max(share, 0), 1);
}

// Where a pointer sits in the drawing's own units, whatever size the chart is shown at.
export function svgPointOf(svg: SVGSVGElement, event: PointerEvent): { x: number; y: number } {
  const rect: DOMRect = svg.getBoundingClientRect();
  return { x: ((event.clientX - rect.left) / rect.width) * WIDTH, y: ((event.clientY - rect.top) / rect.height) * HEIGHT };
}

export function shape(tag: string, attributes: Record<string, string | number>): SVGElement {
  const node: SVGElement = document.createElementNS(SVG_NS, tag) as SVGElement;
  Object.entries(attributes).forEach(([name, value]: [string, string | number]): void => node.setAttribute(name, String(value)));
  return node;
}
