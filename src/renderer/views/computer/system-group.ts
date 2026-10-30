import type { ComputerStatus, DiskUsage, ProcessLoad, Temperatures } from '../../../shared/computer';
import { element } from '../../dom';
import { group, row, subheading } from './computer-controls';

// Past this share a disk's meter turns orange, as the usage meters do.
const DISK_WARNING_PERCENT: number = 85;
const GB_DECIMALS: number = 1;

export function renderSystemGroup(status: ComputerStatus): HTMLElement[] {
  const parts: HTMLElement[] = [];
  const tiles: HTMLElement[] = loadTiles(status);
  if (tiles.length > 0) parts.push(subheading('System'), withTiles(tiles));
  if (status.disks.length > 0) parts.push(subheading('Disks'), group(...status.disks.map(diskRow)));
  if (status.processes !== null) parts.push(subheading('Heaviest programs'), processGroup(status.processes.cpu, status.processes.memory));
  return parts;
}

function loadTiles(status: ComputerStatus): HTMLElement[] {
  const tiles: HTMLElement[] = [];
  if (status.system !== null) {
    tiles.push(tile('CPU', `${Math.round(status.system.cpuPercent)}%`));
    tiles.push(tile('RAM', `${status.system.ramGb.toFixed(GB_DECIMALS)} / ${Math.round(status.system.ramTotalGb)} GB`));
  }
  const temperatures: Temperatures | null = status.temperatures;
  const cpuTemperature: number | null = temperatures?.cpu ?? status.system?.cpuTemperature ?? null;
  if (cpuTemperature !== null) tiles.push(tile('CPU temp', `${Math.round(cpuTemperature)}°C`));
  if (temperatures?.gpu != null) tiles.push(tile('GPU temp', `${Math.round(temperatures.gpu)}°C`));
  if (temperatures?.nvme != null) tiles.push(tile('SSD temp', `${Math.round(temperatures.nvme)}°C`));
  return tiles;
}

function tile(caption: string, value: string): HTMLElement {
  const box: HTMLDivElement = element('div', 'computer-tile');
  box.append(element('span', 'computer-tile-value', value), element('span', 'computer-tile-caption', caption));
  return box;
}

function withTiles(tiles: HTMLElement[]): HTMLElement {
  const box: HTMLDivElement = element('div', 'computer-tiles');
  box.append(...tiles);
  return box;
}

function diskRow(disk: DiskUsage): HTMLElement {
  const meter: HTMLDivElement = element('div', 'meter');
  const fill: HTMLDivElement = element('div', 'meter-fill');
  fill.style.width = `${Math.min(100, disk.percent)}%`;
  meter.append(fill);
  const line: HTMLElement = row(`computer-disk${disk.percent >= DISK_WARNING_PERCENT ? ' is-high' : ''}`, element('span', 'computer-row-label', disk.mount), meter);
  line.append(element('span', 'computer-row-value', `${disk.free} free`));
  return line;
}

function processGroup(cpu: readonly ProcessLoad[], memory: readonly ProcessLoad[]): HTMLElement {
  const columns: HTMLDivElement = element('div', 'computer-processes');
  columns.append(processColumn('CPU', cpu, (value: number) => `${value.toFixed(GB_DECIMALS)}%`), processColumn('Memory', memory, (value: number) => `${value.toFixed(GB_DECIMALS)} GB`));
  return group(columns);
}

function processColumn(title: string, loads: readonly ProcessLoad[], format: (value: number) => string): HTMLElement {
  const column: HTMLDivElement = element('div', 'computer-process-column');
  column.append(element('span', 'computer-process-title', title));
  for (const load of loads) {
    const line: HTMLDivElement = element('div', 'computer-process');
    line.append(element('span', 'computer-process-name', load.name), element('span', 'computer-row-value', format(load.value)));
    column.append(line);
  }
  return column;
}
