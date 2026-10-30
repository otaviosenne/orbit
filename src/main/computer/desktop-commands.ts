import { homedir } from 'node:os';
import { join } from 'node:path';

// Every program and dotfile script the Computer page runs, in one place: they belong to this desktop's own setup
// (Hyprland, the eww status menu, waybar), and a machine without one simply loses that part of the page.
const HOME: string = homedir();
const STATUS_MENU: string = join(HOME, '.config', 'eww-status-menu', 'scripts');
const HYPR_SCRIPTS: string = join(HOME, '.config', 'hypr', 'scripts');

export interface Command {
  readonly file: string;
  readonly args: readonly string[];
}

const command = (file: string, ...args: string[]): Command => ({ file, args });

export const STATUS_COMMANDS = {
  system: command(join(STATUS_MENU, 'system-stats.sh')),
  overview: command(join(STATUS_MENU, 'system-overview.sh')),
  batteries: command(join(STATUS_MENU, 'device-batteries.sh')),
  audio: command(join(STATUS_MENU, 'audio-state.sh')),
  apps: command(join(STATUS_MENU, 'app-streams.sh')),
  processes: command(join(STATUS_MENU, 'top-processes.sh')),
  notificationCount: command('swaync-client', '--count'),
  doNotDisturb: command('swaync-client', '--get-dnd'),
  media: command('playerctl', 'metadata', '--format', '{{status}}\t{{artist}}\t{{title}}'),
} as const;

// Written by brightness-control.sh with the level it last set.
export const BRIGHTNESS_CACHE: string = `/tmp/ddc_brightness_${process.env['USER'] ?? ''}`;

export const BRIGHTNESS_SCRIPT: string = join(HYPR_SCRIPTS, 'brightness-control.sh');
// Being written by another chat; called by path and never changed here.
export const SCREENS_OFF_SCRIPT: string = join(HYPR_SCRIPTS, 'screens-off.sh');
export const SCREENS_ON_SCRIPT: string = join(HYPR_SCRIPTS, 'screens-on.sh');

// The status menu's Shortcuts row, as it runs them.
export const SHORTCUT_COMMANDS = {
  network: command('kitty', '-e', 'nmtui', 'connect'),
  orbit: command(join(HYPR_SCRIPTS, 'open-orbit.sh')),
  keyboard: command(join(HYPR_SCRIPTS, 'toggle-keyboard.sh')),
  repos: command(join(HYPR_SCRIPTS, 'repo-launcher', 'launch.sh')),
  layout: command(join(HOME, '.config', 'waybar', 'scripts', 'keyboard-layout.sh'), 'toggle'),
  mixer: command('pavucontrol'),
} as const;
