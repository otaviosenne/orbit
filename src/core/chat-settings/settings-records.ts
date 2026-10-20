import type { EffortLevel } from '../../shared/chat-settings';
import { isEffortLevel } from '../../shared/chat-settings';
import type { ChatSettings } from '../../shared/types';
import type { TranscriptRecord } from '../transcript-record';

type SettingsCommandName = 'model' | 'effort';

interface SettingsCommand {
  readonly name: SettingsCommandName;
  readonly args: string;
}

// Claude Code logs a slash command as one user record and what it printed as the next one.
const COMMAND_PATTERN: RegExp = /<command-name>\/(model|effort)<\/command-name>[\s\S]*?<command-args>([^<]*)<\/command-args>/;
const STDOUT_PATTERN: RegExp = /^<local-command-stdout>([\s\S]*)<\/local-command-stdout>$/;
const MODEL_SET_PREFIX: string = 'Set model to ';
const QUOTED_MODEL_PATTERN: RegExp = /`([^`]+)`/;
const EFFORT_SET_PATTERN: RegExp = /^Set effort level to (\w+)/;
// Printed when the asked level is above the model's cap; the level after "set to" is what took effect.
const EFFORT_CAPPED_PATTERN: RegExp = /set to '(\w+)' instead/;
const EFFORT_AUTO_PREFIX: string = 'Effort level set to auto';
// Claude Code's placeholder for replies it made up locally, such as an interruption notice.
const SYNTHETIC_MODEL: string = '<synthetic>';

// Replays the chat's records in order: each reply states its model and effort, and a later /model or /effort
// that succeeded overrides them until the next reply.
export function chatSettingsFrom(records: readonly TranscriptRecord[]): ChatSettings {
  let model: string | null = null;
  let effort: EffortLevel | null = null;
  let command: SettingsCommand | null = null;
  for (const record of records) {
    if (record.isSidechain === true) continue;
    if (record.type === 'assistant') {
      model = replyModel(record) ?? model;
      effort = replyEffort(record) ?? effort;
      command = null;
      continue;
    }
    const text: string | null = userText(record);
    if (text === null) continue;
    const started: SettingsCommand | null = settingsCommand(text);
    if (started !== null) {
      command = started;
      continue;
    }
    const output: string | null = commandOutput(text);
    if (output === null || command === null) continue;
    if (command.name === 'model') model = modelSetBy(command, output) ?? model;
    else effort = effortSetBy(output) ?? effort;
    command = null;
  }
  return { model, effort };
}

// A tail holding a reply with both values needs no older records.
export function isComplete(settings: ChatSettings): boolean {
  return settings.model !== null && settings.effort !== null;
}

function replyModel(record: TranscriptRecord): string | null {
  const model: string | undefined = record.message?.model;
  return model === undefined || model === SYNTHETIC_MODEL ? null : model;
}

function replyEffort(record: TranscriptRecord): EffortLevel | null {
  return isEffortLevel(record.effort) ? record.effort : null;
}

function userText(record: TranscriptRecord): string | null {
  const content: unknown = record.message?.content;
  return record.type === 'user' && typeof content === 'string' ? content : null;
}

function settingsCommand(text: string): SettingsCommand | null {
  const match: RegExpExecArray | null = COMMAND_PATTERN.exec(text);
  if (match === null) return null;
  return { name: match[1] as SettingsCommandName, args: (match[2] ?? '').trim() };
}

function commandOutput(text: string): string | null {
  return STDOUT_PATTERN.exec(text.trim())?.[1] ?? null;
}

// The typed alias is the clearest name; the picker leaves no argument, so its printed display name is used.
function modelSetBy(command: SettingsCommand, output: string): string | null {
  if (!output.startsWith(MODEL_SET_PREFIX)) return null;
  if (command.args.length > 0) return command.args;
  const rest: string = output.slice(MODEL_SET_PREFIX.length);
  return QUOTED_MODEL_PATTERN.exec(rest)?.[1] ?? rest.split(' ')[0] ?? null;
}

function effortSetBy(output: string): EffortLevel | null {
  if (output.startsWith(EFFORT_AUTO_PREFIX)) return 'auto';
  const level: string | undefined = EFFORT_CAPPED_PATTERN.exec(output)?.[1] ?? EFFORT_SET_PATTERN.exec(output)?.[1];
  return isEffortLevel(level) ? level : null;
}
