import type { MediaCommand, MediaState, NotificationState } from '../../../shared/computer';
import { element } from '../../dom';
import type { ComputerControls } from './computer-controls';
import { actionButton, group, row, subheading } from './computer-controls';

export function renderNotificationsGroup(notifications: NotificationState | null, controls: ComputerControls): HTMLElement[] {
  if (notifications === null) return [];
  const count: string = notifications.count === 1 ? '1 notification' : `${notifications.count} notifications`;
  const list: HTMLElement = row('computer-buttons', element('span', 'computer-row-label', count), actionButton('Clear all', (): void => controls.act({ kind: 'clear-notifications' })));
  const doNotDisturb: HTMLElement = row(
    'computer-buttons',
    element('span', 'computer-row-label', 'Do not disturb'),
    element('span', 'computer-row-value', notifications.doNotDisturb ? 'On' : 'Off'),
    actionButton(notifications.doNotDisturb ? 'Turn off' : 'Turn on', (): void => controls.act({ kind: 'do-not-disturb' })),
  );
  return [subheading('Notifications'), group(list, doNotDisturb)];
}

const MEDIA_BUTTONS: readonly { readonly command: MediaCommand; readonly label: (playing: boolean) => string }[] = [
  { command: 'previous', label: (): string => 'Previous' },
  { command: 'play-pause', label: (playing: boolean): string => (playing ? 'Pause' : 'Play') },
  { command: 'next', label: (): string => 'Next' },
];

export function renderMediaGroup(media: MediaState | null, controls: ComputerControls): HTMLElement[] {
  if (media === null) return [];
  const text: HTMLDivElement = element('div', 'computer-media-text');
  text.append(element('span', 'computer-media-title', media.title || 'Nothing playing'), element('span', 'computer-media-artist', media.artist));
  const buttons: HTMLDivElement = element('div', 'computer-media-buttons');
  buttons.append(...MEDIA_BUTTONS.map(({ command, label }) => actionButton(label(media.playing), (): void => controls.act({ kind: 'media', command }))));
  return [subheading('Playing'), group(row('computer-media', text, buttons))];
}
