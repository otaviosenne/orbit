import type { ChatColor } from '../../shared/chat-colors';
import { isChatColor } from '../../shared/chat-colors';
import type { ActionResult, ChatSnapshot } from '../../shared/types';
import { pickChatColor } from './chat-color-pick';

const LAST_COLOR_KEY: string = 'orbit.lastNewChatColor';

// Shows a color before the chat confirms it and takes it back if /color fails, like the panel's color picker.
export interface ColorPreview {
  readonly show: (sessionId: string, color: ChatColor) => void;
  readonly undo: (sessionId: string) => void;
}

// Picked at the click, so the placeholder panel already wears the color the chat will get.
export function pickNewChatColor(openChats: readonly ChatSnapshot[]): ChatColor {
  const color: ChatColor = pickChatColor(readLastColor(), openChats.map((chat: ChatSnapshot) => chat.color), Math.random);
  writeLastColor(color);
  return color;
}

// Claude Code has no flag for the color, so it is set with /color once the new chat is up.
export async function applyNewChatColor(chat: ChatSnapshot, color: ChatColor, preview: ColorPreview): Promise<void> {
  preview.show(chat.sessionId, color);
  const result: ActionResult = await window.radar.recolorChat(chat.pid, color);
  if (result.ok) return;
  console.error(`Could not color ${chat.name}: ${result.error ?? 'unknown error'}`);
  preview.undo(chat.sessionId);
}

function readLastColor(): ChatColor | null {
  try {
    const saved: string | null = localStorage.getItem(LAST_COLOR_KEY);
    return saved !== null && isChatColor(saved) ? saved : null;
  } catch {
    return null;
  }
}

function writeLastColor(color: ChatColor): void {
  try {
    localStorage.setItem(LAST_COLOR_KEY, color);
  } catch {
    // The next pick may then repeat this color.
  }
}
