import type { ChatDevices } from '../shared/types';

const NO_DEVICES: ChatDevices = { emulator: null, browser: null, servers: [] };

// Made-up devices: the mobile chat tests on an emulator and checks the web dashboard, the checkout chat only browses.
const DEMO_DEVICES: ReadonlyMap<string, ChatDevices> = new Map([
  [
    '9d3b6e1f-4c8a-4f2e-a7d9-1c5e8b3f6a20',
    {
      emulator: { label: 'Pixel_8_API_35:5554', metroPort: 8081, metroApp: 'mobile', publicUrl: 'https://8081.example.com' },
      browser: { title: 'Notifications · Acme Console', url: 'http://localhost:3000/notifications', publicUrl: 'https://3000.example.com/notifications' },
      servers: [
        { port: 3000, name: 'Vite · console', publicUrl: 'https://3000.example.com' },
        { port: 8000, name: 'uvicorn · api', publicUrl: 'https://8000.example.com' },
        { port: 8081, name: 'Metro · mobile', publicUrl: 'https://8081.example.com' },
      ],
    },
  ],
  ['3f6c2a1e-8b4d-4c7a-9e21-5d0b7f3a9c11', { emulator: null, browser: { title: 'Checkout · Acme', url: 'http://localhost:5173/checkout', publicUrl: null }, servers: [{ port: 5173, name: 'Vite · checkout', publicUrl: null }] }],
]);

export function demoChatDevices(sessionId: unknown): ChatDevices {
  return typeof sessionId === 'string' ? (DEMO_DEVICES.get(sessionId) ?? NO_DEVICES) : NO_DEVICES;
}
