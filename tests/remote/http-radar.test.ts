import { describe, expect, it } from 'vitest';
import type { RemoteChannel } from '../../src/shared/remote-access';
import { isRemoteChannel, REMOTE_ACCESS } from '../../src/shared/remote-access';
import type { RadarApi } from '../../src/shared/types';
import { createHttpRadar } from '../../src/web/http-radar';
import type { RemoteCall } from '../../src/web/remote-caller';

interface Recorded {
  readonly channel: RemoteChannel;
  readonly args: readonly unknown[];
}

const SESSION: string = '3f6c2a1e-8b4d-4c7a-9e21-5d0b7f3a9c11';
const PID: number = 41021;
const IMAGE: Uint8Array = new Uint8Array([1, 2, 3]);

// Every remote method, called with sample arguments, and the call it must turn into.
const CASES: readonly [(radar: RadarApi) => unknown, RemoteChannel, readonly unknown[]][] = [
  [(radar) => radar.getChats(), 'GetChats', []],
  [(radar) => radar.getTranscript(SESSION), 'GetTranscript', [SESSION, null]],
  [(radar) => radar.getTranscript(SESSION, 20), 'GetTranscript', [SESSION, 20]],
  [(radar) => radar.getAgentTranscript(SESSION, 'a1', 5), 'GetAgentTranscript', [SESSION, 'a1', 5]],
  [(radar) => radar.getImage(SESSION, 'k'), 'GetImage', [SESSION, 'k']],
  [(radar) => radar.getTurnProgress(SESSION), 'GetTurnProgress', [SESSION]],
  [(radar) => radar.getChatColor(SESSION), 'GetChatColor', [SESSION]],
  [(radar) => radar.getUsage(), 'GetUsage', []],
  [(radar) => radar.listLaunchers(), 'ListLaunchers', []],
  [(radar) => radar.openLauncher('acme'), 'OpenLauncher', ['acme']],
  [(radar) => radar.listPastChats(), 'ListPastChats', []],
  [(radar) => radar.getTimelineHistory(7), 'GetTimelineHistory', [7]],
  [(radar) => radar.resumeChat(SESSION), 'ResumeChat', [SESSION]],
  [(radar) => radar.renameChat(PID, 'New'), 'RenameChat', [PID, 'New']],
  [(radar) => radar.recolorChat(PID, 'blue'), 'RecolorChat', [PID, 'blue']],
  [(radar) => radar.sendMessage(PID, 'hi', [{ name: 'a.png', mediaType: 'image/png', bytes: IMAGE }]), 'SendMessage', [PID, 'hi', [{ name: 'a.png', mediaType: 'image/png', bytes: IMAGE }]]],
  [(radar) => radar.interruptChat(PID), 'InterruptChat', [PID]],
  [(radar) => radar.getQuestionPicker(SESSION), 'GetQuestionPicker', [SESSION]],
  [(radar) => radar.answerQuestion(SESSION, 'f', { selected: [1], other: null }), 'AnswerQuestion', [SESSION, 'f', { selected: [1], other: null }]],
  [(radar) => radar.submitAnswers(SESSION, 'f'), 'SubmitAnswers', [SESSION, 'f']],
  [(radar) => radar.answerQuestionSet(SESSION, 'q', []), 'AnswerQuestionSet', [SESSION, 'q', []]],
  [(radar) => radar.stopAgent(SESSION, 'a1'), 'StopAgent', [SESSION, 'a1']],
  [(radar) => radar.getShellOutput(SESSION, 't1'), 'GetShellOutput', [SESSION, 't1']],
  [(radar) => radar.interruptShell(SESSION, 't1'), 'InterruptShell', [SESSION, 't1']],
  [(radar) => radar.getChatSettings(SESSION), 'GetChatSettings', [SESSION]],
  [(radar) => radar.listSkills(SESSION), 'ListSkills', [SESSION]],
  [(radar) => radar.setChatModel(PID, 'opus'), 'SetChatModel', [PID, 'opus']],
  [(radar) => radar.setChatEffort(PID, 'high'), 'SetChatEffort', [PID, 'high']],
  [(radar) => radar.getChatPermissions(SESSION), 'GetChatPermissions', [SESSION]],
  [(radar) => radar.setPermissionMode(SESSION, 'plan'), 'SetPermissionMode', [SESSION, 'plan']],
  [(radar) => radar.getChatResources(), 'GetChatResources', []],
];

function recordingRadar(): { radar: RadarApi; calls: Recorded[] } {
  const calls: Recorded[] = [];
  const call: RemoteCall = <T>(channel: RemoteChannel, args: readonly unknown[]): Promise<T> => {
    calls.push({ channel, args });
    return Promise.resolve(null as T);
  };
  return { radar: createHttpRadar(call), calls };
}

describe('Orbit Web radar over HTTP', () => {
  it('turns each method into its channel with its arguments', async () => {
    for (const [invoke, channel, args] of CASES) {
      const { radar, calls } = recordingRadar();
      await invoke(radar);
      expect(calls, channel).toEqual([{ channel, args }]);
    }
  });

  it('reaches every remote channel', () => {
    const covered: Set<string> = new Set(CASES.map(([, channel]) => channel));
    for (const channel of Object.keys(REMOTE_ACCESS).filter(isRemoteChannel)) expect(covered.has(channel), channel).toBe(true);
  });

  it('answers desktop-only methods locally, without a request', async () => {
    const { radar, calls } = recordingRadar();
    expect((await radar.closeChat(PID)).ok).toBe(false);
    expect((await radar.addShortcut({ label: 'x', chatName: 'x', folder: '/tmp' })).ok).toBe(false);
    expect(await radar.chooseFolder()).toBeNull();
    expect((await radar.startDictation()).error).not.toBeNull();
    expect(await radar.getChatDevices(SESSION)).toEqual({ emulator: null, browser: null });
    await radar.focusChat(PID);
    await radar.openChatWindow(SESSION);
    await expect(radar.getRemoteSettings()).rejects.toThrow();
    expect(calls).toEqual([]);
  });
});
