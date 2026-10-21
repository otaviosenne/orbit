import { element } from '../dom';
import { chatColor } from '../palette';
import { formatCoreCount, formatCpuPercent, formatMemory, formatProcessCount } from './resources-format';
import type { ResourceRow, ResourceTable } from './resources-table';

const PERCENT: number = 100;

export const RESOURCES_NOTE: string =
  'Each chat counts its claude process and everything it started: background shells, MCP servers, dev servers. ' +
  'CPU is shown like top, where 100% is one core. Memory is PSS, so pages shared between processes are counted once; it refreshes every 10 s.';

export function renderResourceTable(table: ResourceTable): HTMLElement {
  const group: HTMLDivElement = element('div', 'settings-group resources');
  group.append(renderHead(), ...table.rows.map(renderRow), renderTotal(table));
  return group;
}

function renderHead(): HTMLElement {
  const row: HTMLDivElement = element('div', 'settings-row resource-row resource-head');
  row.append(element('span', 'resource-name-cell', 'Chat'), element('span', 'resource-metric', 'CPU'), element('span', 'resource-metric', 'Memory'));
  return row;
}

function renderRow(resource: ResourceRow): HTMLElement {
  const row: HTMLDivElement = element('div', 'settings-row resource-row');
  row.style.setProperty('--chat', chatColor(resource.color));
  row.append(
    renderName(resource.name, formatProcessCount(resource.processCount), true),
    renderMetric(formatCpuPercent(resource.cpuPercent), resource.cpuShare),
    renderMetric(formatMemory(resource.memoryBytes), resource.memoryShare),
  );
  return row;
}

function renderTotal(table: ResourceTable): HTMLElement {
  const row: HTMLDivElement = element('div', 'settings-row resource-row resource-total');
  const cpu: HTMLDivElement = element('div', 'resource-metric');
  cpu.append(element('span', 'resource-value', formatCpuPercent(table.total.cpuPercent)), element('span', 'resource-detail', formatCoreCount(table.coreCount)));
  const memory: HTMLDivElement = element('div', 'resource-metric');
  memory.append(element('span', 'resource-value', formatMemory(table.total.memoryBytes)));
  row.append(renderName('Total', formatProcessCount(table.total.processCount), false), cpu, memory);
  return row;
}

function renderName(name: string, detail: string, withDot: boolean): HTMLElement {
  const cell: HTMLDivElement = element('div', 'resource-name-cell');
  if (withDot) cell.append(element('span', 'resource-dot'));
  const text: HTMLDivElement = element('div', 'resource-name-text');
  text.append(element('span', 'resource-name', name), element('span', 'resource-detail', detail));
  cell.append(text);
  return cell;
}

function renderMetric(value: string, share: number): HTMLElement {
  const metric: HTMLDivElement = element('div', 'resource-metric');
  const bar: HTMLDivElement = element('div', 'resource-bar');
  const fill: HTMLDivElement = element('div', 'resource-bar-fill');
  fill.style.width = `${Math.min(PERCENT, share * PERCENT)}%`;
  bar.append(fill);
  metric.append(element('span', 'resource-value', value), bar);
  return metric;
}
