import { statusAge } from '../../../shared/chat-time';
import type { ChatDevices, ChatSnapshot } from '../../../shared/types';
import { element } from '../../dom';
import { formatDuration } from '../../format';
import { CLOSE_ICON } from '../../icons';
import { VOICE_NUMBER_CLASS, showChatNumber } from '../../voice-nav/voice-number';
import { chatStatusLabel } from '../../status-label';
import { workStateOf } from '../../work-state';
import { setText, showSpinner } from './in-place';
import type { DeviceOpen } from './tile-devices';
import { TileDevices } from './tile-devices';

export interface TileHeaderHandlers {
  readonly remove: () => void;
  readonly openDevice: DeviceOpen;
}

// A tile's title bar: it names the chat, shows how it is doing, and is the handle tiles are dragged by.
export class TileHeader {
  readonly root: HTMLElement = element('header', 'tile-header');
  private readonly number: HTMLElement = element('span', `${VOICE_NUMBER_CLASS} tile-number`);
  private readonly name: HTMLElement = element('span', 'tile-name');
  private readonly spinner: HTMLElement = element('span', 'tile-spinner');
  private readonly status: HTMLElement = element('span', 'tile-status');
  private readonly statusLabel: HTMLElement = element('span', 'tile-status-label');
  private readonly statusTime: HTMLElement = element('span', 'tile-status-time');
  private readonly devices: TileDevices;

  constructor(handlers: TileHeaderHandlers) {
    this.devices = new TileDevices(this.root, this.name, handlers.openDevice);
    const remove: HTMLButtonElement = iconButton(CLOSE_ICON, 'Remove from Panel', handlers.remove);
    const actions: HTMLDivElement = element('div', 'tile-actions');
    actions.append(remove);
    this.status.append(this.statusLabel, this.statusTime);
    this.root.append(this.number, this.name, this.spinner, this.status, actions);
  }

  update(chat: ChatSnapshot, now: number, devices: ChatDevices): void {
    showChatNumber(this.number, chat.sessionId);
    setText(this.name, chat.name);
    this.devices.show(devices);
    this.root.title = chat.repository.name;
    showSpinner(this.spinner, workStateOf(chat));
    setText(this.statusLabel, chatStatusLabel(chat.status));
    setText(this.statusTime, formatDuration(statusAge(chat, now)));
    this.status.title = chatStatusLabel(chat.status);
    this.status.classList.toggle('is-waiting', chat.status === 'waiting');
  }
}

function iconButton(icon: string, label: string, onClick: () => void): HTMLButtonElement {
  const button: HTMLButtonElement = element('button', 'icon-button tile-button');
  button.type = 'button';
  button.title = label;
  button.setAttribute('aria-label', label);
  button.innerHTML = icon;
  button.addEventListener('click', onClick);
  return button;
}
