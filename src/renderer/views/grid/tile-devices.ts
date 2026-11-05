import type { LocalCiRun } from '../../../shared/local-ci';
import type { ChatDevices } from '../../../shared/types';
import { NO_DEVICES, sameDevices } from '../../board/board-devices';
import type { CardDeviceKind } from '../../board/card-devices';
import { cardDeviceAt, renderCardDevices } from '../../board/card-devices';

export type DeviceOpen = (kind: CardDeviceKind) => void;

// The board card's device and local CI icons, right after a tile's name. The header lives across polls,
// so the icons are replaced only when the chat's devices change, never under a press.
export class TileDevices {
  private icons: HTMLElement[] = [];
  private shown: ChatDevices = NO_DEVICES;
  private shownLocalCi: number | null = null;

  // Listened to on the header, which outlives the icons that come and go inside it.
  constructor(header: HTMLElement, private readonly name: HTMLElement, open: DeviceOpen) {
    header.addEventListener('click', (event: MouseEvent): void => {
      const kind: CardDeviceKind | null = cardDeviceAt(event.target);
      if (kind === null) return;
      event.stopPropagation();
      open(kind);
    });
  }

  show(devices: ChatDevices, localCi: LocalCiRun | null): void {
    const localCiStart: number | null = localCi?.startedAt ?? null;
    if (sameDevices(devices, this.shown) && localCiStart === this.shownLocalCi) return;
    this.shown = devices;
    this.shownLocalCi = localCiStart;
    this.icons.forEach((icon: HTMLElement): void => icon.remove());
    this.icons = renderCardDevices(devices, localCi);
    this.name.after(...this.icons);
  }
}
