import type { IpcChannel } from './ipc-channels';

export type ChannelKey = keyof typeof IpcChannel;

// Sent with ipcRenderer.send rather than invoked, so they get listeners instead of routes.
export const LISTENER_CHANNELS = ['DictationPrepare', 'DictationAudio', 'DictationCancel'] as const satisfies readonly ChannelKey[];
// Main pushes on these; the renderer listens.
export const PUSH_CHANNELS = ['DictationTranscript'] as const satisfies readonly ChannelKey[];
// Orbit Web's own settings: the remote server answers them, in the app and in the demo alike, so no route table does.
export const REMOTE_SETTINGS_CHANNELS = [
  'GetRemoteSettings',
  'SetRemoteEnabled',
  'SetRemoteExternalUrl',
  'RegenerateRemoteToken',
] as const satisfies readonly ChannelKey[];

export type ListenerChannel = (typeof LISTENER_CHANNELS)[number];
export type PushChannel = (typeof PUSH_CHANNELS)[number];
export type RemoteSettingsChannel = (typeof REMOTE_SETTINGS_CHANNELS)[number];

// Every channel a route table answers: the real one in main/routes and the demo's.
export type InvokeChannel = Exclude<ChannelKey, ListenerChannel | PushChannel | RemoteSettingsChannel>;

// Answered per asking window: a dialog parented to it, or a dictation session that pushes text back to it.
export const WINDOW_BOUND_CHANNELS = ['ChooseFolder', 'DictationStart', 'DictationFinish'] as const satisfies readonly InvokeChannel[];
export type WindowBoundChannel = (typeof WINDOW_BOUND_CHANNELS)[number];

// Arguments arrive as the caller sent them (IPC or HTTP), so a route checks them before trusting their types.
export type Route = (...args: unknown[]) => unknown;
