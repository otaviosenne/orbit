import type { LocalCiRun } from '../../shared/local-ci';
import type { ChatSnapshot } from '../../shared/types';
import { element } from '../dom';
import { formatDuration } from '../format';

const TITLE: string = 'Local CI running';

// The monorepo's local CI running under the chat, in green under the header, with how long it has run.
export class LocalCiBar {
  constructor(private readonly root: HTMLElement) {}

  show(chat: ChatSnapshot | null, now: number): void {
    const run: LocalCiRun | null = chat?.localCi ?? null;
    this.root.hidden = run === null;
    if (run === null) return void this.root.replaceChildren();
    const detail: string = [formatDuration(now - run.startedAt), ...run.options].join(' · ');
    this.root.replaceChildren(element('span', 'local-ci-pulse'), element('span', 'local-ci-title', TITLE), element('span', 'local-ci-detail', detail));
  }
}
