import type { ComputerStatus } from '../shared/computer';

// A believable desktop for the demo's Computer page; nothing on the real machine is read.
export const DEMO_COMPUTER: ComputerStatus = {
  system: { cpuPercent: 23, ramGb: 18.4, ramTotalGb: 64, cpuTemperature: 54 },
  temperatures: { cpu: 54, gpu: 47, nvme: 41 },
  disks: [
    { mount: '/', percent: 62, free: '140G' },
    { mount: '/data', percent: 48, free: '480G' },
  ],
  batteries: { mouse: 80, headset: 64, airpods: null },
  audio: {
    volume: 70,
    muted: false,
    max: 150,
    outputs: [
      { name: 'demo-headset', description: 'Wireless Headset', active: true },
      { name: 'demo-speakers', description: 'Desk Speakers', active: false },
    ],
  },
  apps: [
    { id: '101', name: 'Music · Playback', volume: 80, muted: false },
    { id: '102', name: 'Browser · Video', volume: 100, muted: false },
  ],
  brightness: 70,
  notifications: { count: 3, doNotDisturb: false },
  media: { playing: true, title: 'Focus Mix', artist: 'Lo-fi Radio' },
  processes: {
    cpu: [
      { name: 'claude', value: 9.1 },
      { name: 'node', value: 6.4 },
      { name: 'chrome', value: 4.2 },
    ],
    memory: [
      { name: 'chrome', value: 3.8 },
      { name: 'claude', value: 2.1 },
      { name: 'node', value: 1.6 },
    ],
  },
};
