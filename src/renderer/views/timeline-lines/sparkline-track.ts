import { element } from '../../dom';
import { setTip } from '../../tooltip';
import type { TimeWindow } from '../timeline-layout';
import { toPercent } from '../timeline-layout';
import { renderGridLine, renderNowLine } from '../timeline-track';
import type { CountStep } from './agent-count-series';
import { peakCount } from './agent-count-series';
import type { SparkScale } from './sparkline-path';
import { sparkAreaPath, sparkLinePath } from './sparkline-path';
import { countStepTip } from './sparkline-tips';

const SVG_NAMESPACE: 'http://www.w3.org/2000/svg' = 'http://www.w3.org/2000/svg';
// Matches .spark-track's height in styles.css, so one SVG unit is one pixel vertically.
export const SPARK_HEIGHT_PX: number = 40;
const SPARK_INSET_PX: number = 5;
const PERCENT_SPAN: number = 100;

// What every lane shares on one poll: the time axis and the count that reaches the top.
export interface SparkFrame {
  readonly window: TimeWindow;
  readonly ticks: readonly number[];
  readonly now: number;
  readonly peak: number;
}

// A lane's drawing area in the line view. The SVG paths are kept and only their shape changes, so the line
// never blinks between polls; the grid and the invisible hover strips are cheap and simply redrawn.
export class SparklineTrack {
  readonly root: HTMLDivElement = element('div', 'lane-track spark-track');
  private readonly grid: HTMLDivElement = element('div', 'spark-grid');
  private readonly area: SVGPathElement = svgElement('path', 'spark-area');
  private readonly line: SVGPathElement = svgElement('path', 'spark-line');
  private readonly hits: HTMLDivElement = element('div', 'spark-hits');

  constructor() {
    const svg: SVGSVGElement = svgElement('svg', 'spark-svg');
    svg.setAttribute('viewBox', `0 0 ${PERCENT_SPAN} ${SPARK_HEIGHT_PX}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');
    svg.append(this.area, this.line);
    this.root.append(this.grid, svg, this.hits);
  }

  update(steps: readonly CountStep[], frame: SparkFrame): void {
    const scale: SparkScale = { window: frame.window, peak: frame.peak, height: SPARK_HEIGHT_PX, inset: SPARK_INSET_PX };
    setPath(this.area, sparkAreaPath(steps, scale));
    setPath(this.line, sparkLinePath(steps, scale));
    this.grid.replaceChildren(...frame.ticks.map((tick: number) => renderGridLine(tick, frame.window)), renderNowLine(frame.window, frame.now));
    const lanePeak: number = peakCount(steps);
    this.hits.replaceChildren(...steps.map((step: CountStep) => renderHitStrip(step, lanePeak, frame.window)));
  }
}

// One invisible strip per stretch of constant count, so hovering anywhere on the lane tells the count at that time.
function renderHitStrip(step: CountStep, lanePeak: number, window: TimeWindow): HTMLElement {
  const strip: HTMLDivElement = element('div', 'spark-hit');
  const from: number = toPercent(step.start, window);
  strip.style.left = `${from}%`;
  strip.style.width = `${toPercent(step.end, window) - from}%`;
  setTip(strip, countStepTip(step, lanePeak));
  return strip;
}

// Unchanged shapes are left alone rather than re-set, which would make the browser repaint every lane each poll.
function setPath(path: SVGPathElement, d: string): void {
  if (path.getAttribute('d') !== d) path.setAttribute('d', d);
}

function svgElement<K extends keyof SVGElementTagNameMap>(tag: K, className: string): SVGElementTagNameMap[K] {
  const node: SVGElementTagNameMap[K] = document.createElementNS(SVG_NAMESPACE, tag);
  node.setAttribute('class', className);
  return node;
}
