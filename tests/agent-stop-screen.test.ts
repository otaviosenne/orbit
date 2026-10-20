import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isShowingAgent } from '../src/main/agent-stop/agent-panel';
import { labelMatches } from '../src/main/agent-stop/label-match';
import { parseTasksScreen, selectedIndex } from '../src/main/agent-stop/tasks-screen';
import type { TasksScreen } from '../src/main/agent-stop/tasks-screen';
import { terminalBlocker } from '../src/main/agent-stop/terminal-readiness';

// Screens captured with `kitty @ get-text` from a throwaway chat running background agents and a shell.
function fixture(name: string): string {
  return readFileSync(join(__dirname, 'fixtures', 'agent-stop', name), 'utf8');
}

describe('parseTasksScreen', () => {
  it('reads the list of tasks, telling agents from shells, with the cursor on the first row', () => {
    const screen: TasksScreen | null = parseTasksScreen(fixture('tasks-list.txt'));
    expect(screen).toEqual({
      kind: 'list',
      rows: [
        { label: 'sleep 240', isAgent: false, isSelected: true },
        { label: 'Agent K: count', isAgent: true, isSelected: false },
        { label: 'Agent J: count', isAgent: true, isSelected: false },
      ],
    });
    expect(screen === null ? -1 : selectedIndex(screen)).toBe(0);
  });

  it('follows the cursor down the list', () => {
    const screen: TasksScreen | null = parseTasksScreen(fixture('tasks-list-cursor-last.txt'));
    expect(screen === null ? -1 : selectedIndex(screen)).toBe(2);
  });

  it('reads the list drawn above the prompt while the chat is busy, ignoring the agent panel below', () => {
    expect(parseTasksScreen(fixture('tasks-list-busy.txt'))).toEqual({
      kind: 'list',
      rows: [
        { label: 'sleep 200', isAgent: false, isSelected: false },
        { label: 'Agent G: count', isAgent: true, isSelected: true },
        { label: 'Agent F: count', isAgent: true, isSelected: false },
      ],
    });
  });

  it('reads an empty list', () => {
    expect(parseTasksScreen(fixture('tasks-empty.txt'))).toEqual({ kind: 'list', rows: [] });
  });

  it("reads an agent's details by the description in their title", () => {
    expect(parseTasksScreen(fixture('tasks-detail.txt'))).toEqual({ kind: 'detail', agentLabel: 'Agent J: count' });
  });

  it("reads a shell's details as no agent", () => {
    expect(parseTasksScreen(fixture('shell-detail.txt'))).toEqual({ kind: 'detail', agentLabel: null });
  });

  it('finds no dialog on the chat itself, its agent selector or an agent view', () => {
    expect(parseTasksScreen(fixture('main-idle.txt'))).toBeNull();
    expect(parseTasksScreen(fixture('after-close.txt'))).toBeNull();
    expect(parseTasksScreen(fixture('main-selector.txt'))).toBeNull();
    expect(parseTasksScreen(fixture('agent-view.txt'))).toBeNull();
  });
});

describe('isShowingAgent', () => {
  it('is true while the terminal shows one of the agents instead of main', () => {
    expect(isShowingAgent(fixture('agent-view.txt'))).toBe(true);
  });

  it('is false on main, with or without the agent selector focused', () => {
    expect(isShowingAgent(fixture('main-idle.txt'))).toBe(false);
    expect(isShowingAgent(fixture('main-selector.txt'))).toBe(false);
  });
});

describe('labelMatches', () => {
  it('matches the whole description, ignoring surrounding spaces', () => {
    expect(labelMatches(' Agent J: count ', 'Agent J: count')).toBe(true);
  });

  it('matches a label cut short with an ellipsis', () => {
    expect(labelMatches('Refactor the parser…', 'Refactor the parser and its tests')).toBe(true);
  });

  it('never matches another description', () => {
    expect(labelMatches('Agent J: count', 'Agent K: count')).toBe(false);
    expect(labelMatches('Agent J', 'Agent J: count')).toBe(false);
    expect(labelMatches('…', 'Agent J: count')).toBe(false);
  });
});

describe('terminalBlocker', () => {
  it('lets /tasks be typed into an empty prompt on main', () => {
    expect(terminalBlocker(fixture('main-idle.txt'))).toBeNull();
    expect(terminalBlocker(fixture('after-close.txt'))).toBeNull();
  });

  it('refuses while an agent is shown, the agent list is focused, or a multi-line draft waits', () => {
    expect(terminalBlocker(fixture('agent-view.txt'))).toMatch(/showing an agent/);
    expect(terminalBlocker(fixture('main-selector.txt'))).toMatch(/agent list focused/);
    expect(terminalBlocker(fixture('main-draft.txt'))).toMatch(/multi-line draft/);
    // A short window scrolls the box's upper rule away; the lower one still frames it.
    expect(terminalBlocker(fixture('main-draft-short-window.txt'))).toMatch(/multi-line draft/);
  });
});

describe('terminalBlocker without a prompt', () => {
  it('refuses when no prompt box is on screen, such as while a dialog owns it', () => {
    expect(terminalBlocker(fixture('shell-detail.txt'))).toMatch(/prompt is not on screen/);
  });
});
