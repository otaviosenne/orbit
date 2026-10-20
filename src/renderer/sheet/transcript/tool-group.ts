import type { ToolItem } from '../../../shared/types';
import { element } from '../../dom';
import type { OpenState } from './disclosure';
import { disclosure } from './disclosure';
import type { ToolGroup } from './group-tools';

// How many distinct tool names the collapsed line lists before trailing off.
const NAMES_IN_SUMMARY: number = 3;

export function renderToolGroup(group: ToolGroup, isOpen: OpenState): HTMLElement {
  const summary: Node[] = [
    element('span', 'tools-count', `${group.tools.length} ${group.tools.length === 1 ? 'tool' : 'tools'}`),
    element('span', 'tools-names', toolNames(group.tools)),
  ];
  const failures: number = group.tools.filter((tool: ToolItem) => tool.isError).length;
  if (failures > 0) summary.push(element('span', 'tool-flag is-error', `${failures} failed`));
  if (group.tools.some((tool: ToolItem) => tool.output === null)) summary.push(element('span', 'tool-flag is-running', 'running'));
  return disclosure(`tools:${group.id}`, 'tool-group', summary, group.tools.map((tool: ToolItem) => renderTool(tool, isOpen)), isOpen);
}

function renderTool(tool: ToolItem, isOpen: OpenState): HTMLElement {
  const summary: Node[] = [element('span', 'tool-name', tool.name), element('span', 'tool-summary', tool.summary)];
  if (tool.isError) summary.push(element('span', 'tool-flag is-error', 'failed'));
  const body: Node[] = [element('span', 'tool-label', 'Input'), element('pre', 'tool-text', tool.input)];
  body.push(element('span', 'tool-label', 'Output'), element('pre', `tool-text${tool.isError ? ' is-error' : ''}`, tool.output ?? 'Still running...'));
  return disclosure(`tool:${tool.id}`, 'tool', summary, body, isOpen);
}

function toolNames(tools: readonly ToolItem[]): string {
  const names: string[] = [...new Set(tools.map((tool: ToolItem) => tool.name))];
  const shown: string = names.slice(0, NAMES_IN_SUMMARY).join(', ');
  return names.length > NAMES_IN_SUMMARY ? `${shown}, …` : shown;
}
