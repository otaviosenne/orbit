import type { PeerDirection, PeerItem } from '../../../shared/types';
import { element } from '../../dom';
import { formatClock } from '../../format';
import { renderMarkdown } from '../../markdown';
import type { OpenState } from './disclosure';
import { disclosure } from './disclosure';

const DIRECTION_LABELS: Readonly<Record<PeerDirection, string>> = { in: 'From', out: 'To' };

// A message exchanged with another chat: collapsed to its first line, expandable to the full text.
export function renderPeer(peer: PeerItem, isOpen: OpenState): HTMLElement {
  const body: HTMLDivElement = element('div', 'markdown');
  renderMarkdown(body, peer.text);
  const summary: Node[] = [
    element('span', 'peer-label', `${DIRECTION_LABELS[peer.direction]} ${peer.chat}`),
    element('span', 'peer-preview', peer.text.trim().split('\n')[0] ?? ''),
    element('span', 'peer-time', formatClock(peer.timestamp)),
  ];
  return disclosure(`peer:${peer.id}`, `peer peer-${peer.direction}`, summary, [body], isOpen);
}
