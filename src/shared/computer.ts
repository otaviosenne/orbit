// The desktop as Orbit's Computer page shows it, read from the scripts its status menu already uses. Each part is
// null when its source is missing or failed, and the page leaves that part out.
export interface ComputerStatus {
  readonly system: SystemLoad | null;
  readonly temperatures: Temperatures | null;
  readonly disks: readonly DiskUsage[];
  readonly batteries: DeviceBatteries | null;
  readonly audio: AudioState | null;
  readonly apps: readonly AppStream[];
  readonly brightness: number | null;
  readonly notifications: NotificationState | null;
  readonly media: MediaState | null;
  readonly processes: TopProcesses | null;
}

export interface SystemLoad {
  readonly cpuPercent: number;
  readonly ramGb: number;
  readonly ramTotalGb: number;
  readonly cpuTemperature: number | null;
}

export interface Temperatures {
  readonly cpu: number | null;
  readonly gpu: number | null;
  readonly nvme: number | null;
}

export interface DiskUsage {
  readonly mount: string;
  readonly percent: number;
  readonly free: string;
}

// Percent of charge; null for a device that is off or not paired.
export interface DeviceBatteries {
  readonly mouse: number | null;
  readonly headset: number | null;
  readonly airpods: number | null;
}

export interface AudioOutput {
  readonly name: string;
  readonly description: string;
  readonly active: boolean;
}

export interface AudioState {
  readonly volume: number;
  readonly muted: boolean;
  readonly max: number;
  readonly outputs: readonly AudioOutput[];
}

export interface AppStream {
  readonly id: string;
  readonly name: string;
  readonly volume: number;
  readonly muted: boolean;
}

export interface NotificationState {
  readonly count: number;
  readonly doNotDisturb: boolean;
}

export interface MediaState {
  readonly playing: boolean;
  readonly title: string;
  readonly artist: string;
}

export interface ProcessLoad {
  readonly name: string;
  readonly value: number;
}

// CPU in percent and memory in GB, heaviest first.
export interface TopProcesses {
  readonly cpu: readonly ProcessLoad[];
  readonly memory: readonly ProcessLoad[];
}

export type PowerAction = 'shutdown' | 'reboot' | 'suspend' | 'lock';
export type MediaCommand = 'play-pause' | 'next' | 'previous';
// The status menu's Shortcuts, which open on the desktop's screen.
export type ComputerShortcut = 'network' | 'orbit' | 'keyboard' | 'repos' | 'layout' | 'mixer';

export const POWER_ACTIONS: readonly PowerAction[] = ['lock', 'suspend', 'reboot', 'shutdown'];
export const MEDIA_COMMANDS: readonly MediaCommand[] = ['previous', 'play-pause', 'next'];
export const COMPUTER_SHORTCUTS: readonly ComputerShortcut[] = ['network', 'orbit', 'keyboard', 'repos', 'layout', 'mixer'];

// Matches the status menu's boost ceiling (audio-limits.sh), so a 140% setup stays reachable.
export const MAX_VOLUME_PERCENT: number = 150;

export type ComputerAction =
  | { readonly kind: 'power'; readonly power: PowerAction }
  | { readonly kind: 'screens'; readonly on: boolean }
  | { readonly kind: 'volume'; readonly percent: number }
  | { readonly kind: 'mute' }
  | { readonly kind: 'output'; readonly name: string }
  | { readonly kind: 'app-volume'; readonly id: string; readonly percent: number }
  | { readonly kind: 'app-mute'; readonly id: string }
  | { readonly kind: 'brightness'; readonly step: 'up' | 'down' }
  | { readonly kind: 'do-not-disturb' }
  | { readonly kind: 'clear-notifications' }
  | { readonly kind: 'media'; readonly command: MediaCommand }
  | { readonly kind: 'shortcut'; readonly shortcut: ComputerShortcut };
