import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { silentlyOnWorkspace } from '../src/main/hyprland-exec';
import { buildNewChatCommand } from '../src/main/new-chat-command';
import type { LauncherEntry } from '../src/shared/types';

const TRICKY_NAME: string = `It's $HOME "now" 🧸 \`x\``;
const LAUNCHER: LauncherEntry = { name: 'acme', command: 'acme repo', chatName: TRICKY_NAME, folder: null };
const SHORTCUT: LauncherEntry = { name: 'Client', command: '/x/start-shortcut.sh client', chatName: TRICKY_NAME, folder: "/home/me/code/client's portal" };

// Runs the command the way Hyprland and then kitty would: sh parses it, kitty receives the words.
function kittyArguments(command: string): string[] {
  const script: string = `kitty() { printf '%s\\0' "$@"; }; ${command}`;
  return execFileSync('/bin/sh', ['-c', script], { encoding: 'utf8' }).split('\0').slice(0, -1);
}

// What bash -ic would do with the inner script, with a fake claude and launcher standing in for the real ones.
function innerRun(innerScript: string, prelude: string): string {
  return execFileSync('/bin/bash', ['-c', `${prelude}; ${innerScript.replace(/; exec bash$/, '')}`], { encoding: 'utf8' });
}

describe('buildNewChatCommand', () => {
  it('shadows claude so a ~/.bashrc launcher starts the chat under its name, whatever the name holds', () => {
    const [bash, flag, script] = kittyArguments(buildNewChatCommand(LAUNCHER));
    expect([bash, flag]).toEqual(['bash', '-ic']);
    expect(script).toMatch(/; acme repo; exec bash$/);
    const output: string = innerRun(script ?? '', `claude_binary() { printf '[%s]' "$@"; }; acme() { claude; }; command() { shift; claude_binary "$@"; }`);
    expect(output).toBe(`[--name][${TRICKY_NAME}]`);
  });

  it('opens a shortcut in its folder and names the chat directly', () => {
    const args: string[] = kittyArguments(buildNewChatCommand(SHORTCUT));
    expect(args.slice(0, 4)).toEqual(['--directory', SHORTCUT.folder, 'bash', '-ic']);
    const output: string = innerRun(args[4] ?? '', `claude() { printf '[%s]' "$@"; }`);
    expect(output).toBe(`[--name][${TRICKY_NAME}]`);
  });

  it('puts the window on its workspace without following it', () => {
    expect(silentlyOnWorkspace(99, 'kitty')).toBe('[workspace 99 silent] kitty');
  });
});
