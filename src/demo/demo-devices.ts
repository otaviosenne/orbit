import type { ChatDevices } from '../shared/types';

const NO_DEVICES: ChatDevices = { emulator: null, browser: null };

// Made-up devices: the mobile chat tests on an emulator and checks the web dashboard, the checkout chat only browses.
const DEMO_DEVICES: ReadonlyMap<string, ChatDevices> = new Map([
  [
    '9d3b6e1f-4c8a-4f2e-a7d9-1c5e8b3f6a20',
    { emulator: { label: 'Pixel_8_API_35:5554' }, browser: { title: 'Notifications · Acme Console', url: 'http://localhost:3000/notifications' } },
  ],
  ['3f6c2a1e-8b4d-4c7a-9e21-5d0b7f3a9c11', { emulator: null, browser: { title: 'Checkout · Acme', url: 'http://localhost:5173/checkout' } }],
]);

export function demoChatDevices(sessionId: unknown): ChatDevices {
  return typeof sessionId === 'string' ? (DEMO_DEVICES.get(sessionId) ?? NO_DEVICES) : NO_DEVICES;
}
