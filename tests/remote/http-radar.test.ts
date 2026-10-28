import { describe, expect, it } from 'vitest';
import type { RemoteChannel } from '../../src/shared/remote-access';
import { isRemoteChannel, REMOTE_ACCESS } from '../../src/shared/remote-access';
import type { DictationTranscript, RadarApi } from '../../src/shared/types';
import { createHttpRadar } from '../../src/web/http-radar';
import type { RemoteVoice } from '../../src/web/http-radar';
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
  [(radar) => radar.getAttachment('/home/u/.cache/orbit/attachments/a.pdf'), 'GetAttachment', ['/home/u/.cache/orbit/attachments/a.pdf']],
  [(radar) => radar.getTurnProgress(SESSION), 'GetTurnProgress', [SESSION]],
  [(radar) => radar.getChatColor(SESSION), 'GetChatColor', [SESSION]],
  [(radar) => radar.getUsage(), 'GetUsage', []],
  [(radar) => radar.listLaunchers(), 'ListLaunchers', []],
  [(radar) => radar.openLauncher('acme'), 'OpenLauncher', ['acme']],
  [(radar) => radar.listPastChats(), 'ListPastChats', []],
  [(radar) => radar.getTimelineHistory(7), 'GetTimelineHistory', [7]],
  [(radar) => radar.resumeChat(SESSION), 'ResumeChat', [SESSION, false]],
  [(radar) => radar.resumeChat(SESSION, true), 'ResumeChat', [SESSION, true]],
  [(radar) => radar.renameChat(PID, 'New'), 'RenameChat', [PID, 'New']],
  [(radar) => radar.recolorChat(PID, 'blue'), 'RecolorChat', [PID, 'blue']],
  [(radar) => radar.sendMessage(PID, 'hi', [{ name: 'a.png', mediaType: 'image/png', bytes: IMAGE }]), 'SendMessage', [PID, 'hi', [{ name: 'a.png', mediaType: 'image/png', bytes: IMAGE }]]],
  [(radar) => radar.interruptChat(PID), 'InterruptChat', [PID]],
  [(radar) => radar.pauseChats([{ pid: PID, interrupt: true }]), 'PauseChats', [[{ pid: PID, interrupt: true }]]],
  [(radar) => radar.continueChats([PID]), 'ContinueChats', [[PID]]],
  [(radar) => radar.getQuestionPicker(SESSION), 'GetQuestionPicker', [SESSION]],
  [(radar) => radar.answerQuestion(SESSION, 'f', { selected: [1], other: null }), 'AnswerQuestion', [SESSION, 'f', { selected: [1], other: null }]],
  [(radar) => radar.submitAnswers(SESSION, 'f'), 'SubmitAnswers', [SESSION, 'f']],
  [(radar) => radar.answerQuestionSet(SESSION, 'q', []), 'AnswerQuestionSet', [SESSION, 'q', []]],
  [(radar) => radar.declineQuestion(SESSION), 'DeclineQuestion', [SESSION]],
  [(radar) => radar.stopAgent(SESSION, 'a1'), 'StopAgent', [SESSION, 'a1']],
  [(radar) => radar.getShellOutput(SESSION, 't1'), 'GetShellOutput', [SESSION, 't1']],
  [(radar) => radar.interruptShell(SESSION, 't1'), 'InterruptShell', [SESSION, 't1']],
  [(radar) => radar.getChatSettings(SESSION), 'GetChatSettings', [SESSION]],
  [(radar) => radar.listSkills(SESSION), 'ListSkills', [SESSION]],
  [(radar) => radar.listMcpServers(SESSION), 'ListMcpServers', [SESSION]],
  [(radar) => radar.openChatMcp(PID), 'OpenChatMcp', [PID]],
  [(radar) => radar.setChatModel(PID, 'opus'), 'SetChatModel', [PID, 'opus']],
  [(radar) => radar.setChatEffort(PID, 'high'), 'SetChatEffort', [PID, 'high']],
  [(radar) => radar.answerSettingSwitch(PID, true), 'AnswerSettingSwitch', [PID, true]],
  [(radar) => radar.getChatPermissions(SESSION), 'GetChatPermissions', [SESSION]],
  [(radar) => radar.setPermissionMode(SESSION, 'plan'), 'SetPermissionMode', [SESSION, 'plan']],
  [(radar) => radar.getChatResources(), 'GetChatResources', []],
];

const PCM: Uint8Array = new Uint8Array([0, 1, 2, 3]);

function recordingRadar(): { radar: RadarApi; calls: Recorded[]; voiceSteps: string[] } {
  const calls: Recorded[] = [];
  const voiceSteps: string[] = [];
  const call: RemoteCall = <T>(channel: RemoteChannel, args: readonly unknown[]): Promise<T> => {
    calls.push({ channel, args });
    return Promise.resolve(null as T);
  };
  const voice: RemoteVoice = {
    prepare: (): void => void voiceSteps.push('prepare'),
    start: () => (voiceSteps.push('start'), Promise.resolve({ session: 7, error: null })),
    feed: (session: number, pcm: Uint8Array): void => void voiceSteps.push(`feed ${session} ${pcm.byteLength}`),
    finish: (session: number) => (voiceSteps.push(`finish ${session}`), Promise.resolve({ ok: true, text: 'oi', error: null })),
    cancel: (session: number): void => void voiceSteps.push(`cancel ${session}`),
    onTranscript: (listener: (transcript: DictationTranscript) => void): void => (voiceSteps.push('listen'), listener({ session: 7, text: 'o' })),
  };
  return { radar: createHttpRadar(call, voice), calls, voiceSteps };
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
    expect(await radar.getChatDevices(SESSION)).toEqual({ emulator: null, browser: null });
    await radar.focusChat(PID);
    await radar.openChatWindow(SESSION);
    await expect(radar.getRemoteSettings()).rejects.toThrow();
    expect(calls).toEqual([]);
  });

  it('dictates over the dictation socket, never as calls', async () => {
    const { radar, calls, voiceSteps } = recordingRadar();
    const heard: DictationTranscript[] = [];
    radar.prepareDictation();
    expect(await radar.startDictation()).toEqual({ session: 7, error: null });
    radar.feedDictation(7, PCM);
    radar.onDictationTranscript((transcript: DictationTranscript): void => void heard.push(transcript));
    expect((await radar.finishDictation(7)).text).toBe('oi');
    radar.cancelDictation(7);
    expect(voiceSteps).toEqual(['prepare', 'start', 'feed 7 4', 'listen', 'finish 7', 'cancel 7']);
    expect(heard).toEqual([{ session: 7, text: 'o' }]);
    expect(calls).toEqual([]);
  });
});
