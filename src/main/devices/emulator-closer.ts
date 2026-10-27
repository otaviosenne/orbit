import { homedir } from 'node:os';
import { join } from 'node:path';
import type { DesktopWindow } from '../../core/devices/desktop-window';
import type { EmulatorWindow } from '../../core/devices/emulator-windows';
import { emulatorLabel, emulatorWindows } from '../../core/devices/emulator-windows';
import { runCommand } from '../run-command';

export type CommandRunner = (command: string, args: readonly string[]) => Promise<string>;

export interface WindowSource {
  fresh(): Promise<DesktopWindow[]>;
}

// Where the SDK puts adb when it is not on Orbit's PATH, which comes from the compositor and not from a shell profile.
function adbPath(): string {
  const sdk: string = process.env['ANDROID_HOME'] ?? process.env['ANDROID_SDK_ROOT'] ?? join(homedir(), 'Android', 'Sdk');
  return join(sdk, 'platform-tools', 'adb');
}

// Lists and shuts down the Android emulators open on the desktop, for "pause everything" to quiet the machine.
export class EmulatorCloser {
  constructor(
    private readonly windows: WindowSource,
    private readonly run: CommandRunner = runCommand,
  ) {}

  async labels(): Promise<string[]> {
    return (await this.open()).map(emulatorLabel);
  }

  async closeAll(): Promise<number> {
    const results: boolean[] = await Promise.all((await this.open()).map((emulator: EmulatorWindow): Promise<boolean> => this.close(emulator)));
    return results.filter(Boolean).length;
  }

  private async open(): Promise<EmulatorWindow[]> {
    return emulatorWindows(await this.windows.fresh());
  }

  // adb's console "kill" ends the emulator without the save-state step that closing its window starts; the window is the way
  // out when adb is missing or cannot reach it.
  private async close(emulator: EmulatorWindow): Promise<boolean> {
    try {
      await this.run(adbPath(), ['-s', `emulator-${emulator.port}`, 'emu', 'kill']);
      return true;
    } catch {
      return this.closeWindow(emulator);
    }
  }

  private async closeWindow(emulator: EmulatorWindow): Promise<boolean> {
    try {
      await this.run('hyprctl', ['dispatch', 'closewindow', `address:${emulator.window.address}`]);
      return true;
    } catch {
      return false;
    }
  }
}
