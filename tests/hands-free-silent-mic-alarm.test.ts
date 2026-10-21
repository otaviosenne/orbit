import { describe, expect, it } from 'vitest';
import { SILENT_MIC_ALARM_MS, SilentMicAlarm } from '../src/renderer/sheet/hands-free/silent-mic-alarm';
import { SILENCE_LEVEL } from '../src/renderer/sheet/hands-free/segment-clock';

const DIGITAL_ZERO: number = 0;
const QUIET_ROOM: number = SILENCE_LEVEL / 2;
const START_MS: number = 1000;

describe('SilentMicAlarm', () => {
  it('rings once the microphone has delivered only digital silence for long enough', () => {
    const alarm: SilentMicAlarm = new SilentMicAlarm();
    expect(alarm.heard(DIGITAL_ZERO, START_MS)).toBe(false);
    expect(alarm.heard(DIGITAL_ZERO, START_MS + SILENT_MIC_ALARM_MS - 1)).toBe(false);
    expect(alarm.heard(DIGITAL_ZERO, START_MS + SILENT_MIC_ALARM_MS)).toBe(true);
  });

  it('rings only once, however long the silence lasts', () => {
    const alarm: SilentMicAlarm = new SilentMicAlarm();
    alarm.heard(DIGITAL_ZERO, START_MS);
    alarm.heard(DIGITAL_ZERO, START_MS + SILENT_MIC_ALARM_MS);
    expect(alarm.heard(DIGITAL_ZERO, START_MS + SILENT_MIC_ALARM_MS * 3)).toBe(false);
  });

  it('never rings for a live microphone in a quiet room', () => {
    const alarm: SilentMicAlarm = new SilentMicAlarm();
    alarm.heard(QUIET_ROOM, START_MS);
    expect(alarm.heard(QUIET_ROOM, START_MS + SILENT_MIC_ALARM_MS * 2)).toBe(false);
  });

  it('stays quiet once any sound came through, even if the microphone is muted later', () => {
    const alarm: SilentMicAlarm = new SilentMicAlarm();
    alarm.heard(QUIET_ROOM, START_MS);
    alarm.heard(DIGITAL_ZERO, START_MS + 1);
    expect(alarm.heard(DIGITAL_ZERO, START_MS + SILENT_MIC_ALARM_MS * 2)).toBe(false);
  });
});
