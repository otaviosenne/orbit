import { isChatColor } from '../shared/chat-colors';
import { isEffortLevel, isModelChoice } from '../shared/chat-settings';

export const MAX_NAME_LENGTH: number = 80;

// Each builder returns null when the input cannot become a valid chat command.
export function renameCommand(rawName: string): string | null {
  const name: string = rawName.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME_LENGTH);
  return name.length === 0 ? null : `/rename ${name}`;
}

export function colorCommand(color: string): string | null {
  return isChatColor(color) ? `/color ${color}` : null;
}

// Only the listed aliases and levels pass, so nothing from the renderer reaches the prompt as free text.
export function modelCommand(model: unknown): string | null {
  return isModelChoice(model) ? `/model ${model}` : null;
}

export function effortCommand(effort: unknown): string | null {
  return isEffortLevel(effort) ? `/effort ${effort}` : null;
}

export function messageText(rawText: string): string | null {
  const text: string = rawText.trim();
  return text.length === 0 ? null : text;
}
