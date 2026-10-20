import type { NoticeItem, TurnItem } from '../../../shared/types';
import { element } from '../../dom';
import { formatDuration } from '../../format';
import { renderMarkdown } from '../../markdown';
import type { OpenState } from './disclosure';
import { disclosure } from './disclosure';

export function renderNotice(notice: NoticeItem, isOpen: OpenState): HTMLElement {
  const className: string = `notice notice-${notice.tone}`;
  const title: HTMLSpanElement = element('span', 'notice-title', notice.title);
  if (notice.detail === null) {
    const row: HTMLDivElement = element('div', className);
    row.append(title);
    return row;
  }
  const body: HTMLDivElement = element('div', 'markdown');
  renderMarkdown(body, notice.detail);
  return disclosure(`notice:${notice.id}`, className, [title], [body], isOpen);
}

// The thin divider Claude Code prints when a turn ends ("Cooked for 2h 34m").
export function renderTurn(turn: TurnItem): HTMLElement {
  return element('div', 'turn', `Worked for ${formatDuration(turn.durationMs)}`);
}
