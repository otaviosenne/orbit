import type { ToolItem } from '../../../shared/types';
import type { TranscriptEntry } from './group-tools';

// Changes whenever the entry would render differently; an entry whose version holds keeps its element.
// Messages, notices, peers and turns never change once written; tools get a result and questions an answer.
export function entryVersion(entry: TranscriptEntry): string {
  if (entry.kind === 'tools') return `${entry.id}|${entry.tools.map(toolVersion).join(',')}`;
  if (entry.kind === 'question') return `${entry.id}:${entry.state}`;
  return entry.id;
}

function toolVersion(tool: ToolItem): string {
  if (tool.output === null) return tool.id;
  return tool.isError ? `${tool.id}!` : `${tool.id}+`;
}
