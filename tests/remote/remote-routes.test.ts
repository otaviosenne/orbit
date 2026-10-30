import { describe, expect, it } from 'vitest';
import { DEMO_ROUTES } from '../../src/demo/demo-routes';
import { IpcChannel } from '../../src/shared/ipc-channels';
import { LISTENER_CHANNELS, PUSH_CHANNELS, REMOTE_SETTINGS_CHANNELS, WINDOW_BOUND_CHANNELS } from '../../src/shared/ipc-routing';
import { isRemoteChannel, REMOTE_ACCESS, remoteAccessOf } from '../../src/shared/remote-access';

const NOT_ROUTED: readonly string[] = [...LISTENER_CHANNELS, ...PUSH_CHANNELS, ...REMOTE_SETTINGS_CHANNELS];

describe('remote access policy', () => {
  it('decides every channel exactly once: routed with an access level, or explicitly never routed', () => {
    for (const channel of Object.keys(IpcChannel)) {
      const decided: number = Number(Object.hasOwn(REMOTE_ACCESS, channel)) + Number(NOT_ROUTED.includes(channel));
      expect(decided, channel).toBe(1);
    }
  });

  it('keeps window-bound channels, shortcuts and Orbit Web’s own settings off the web', () => {
    for (const channel of [...WINDOW_BOUND_CHANNELS, 'AddShortcut']) expect(remoteAccessOf(channel), channel).toBe('desktop');
    for (const channel of [...REMOTE_SETTINGS_CHANNELS, ...LISTENER_CHANNELS]) expect(isRemoteChannel(channel), channel).toBe(false);
  });

  it('lets the phone close, suspend, focus and pop out chats, closing only open ones', () => {
    expect(remoteAccessOf('CloseChat')).toBe('chat');
    expect(remoteAccessOf('AnswerApproval')).toBe('chat');
    expect(remoteAccessOf('GetComputerStatus')).toBe('read');
    expect(remoteAccessOf('RunComputerAction')).toBe('action');
    expect(remoteAccessOf('FocusChat')).toBe('chat');
    expect(remoteAccessOf('OpenChatWindow')).toBe('action');
  });

  it('does not mistake inherited object keys for channels', () => {
    expect(isRemoteChannel('constructor')).toBe(false);
    expect(isRemoteChannel('__proto__')).toBe(false);
  });

  it('has a demo route for every remote channel, so the demo serves the whole web app', () => {
    for (const channel of Object.keys(REMOTE_ACCESS).filter(isRemoteChannel)) expect(typeof DEMO_ROUTES[channel], channel).toBe('function');
  });
});
