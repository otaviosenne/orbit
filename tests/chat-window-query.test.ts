import { describe, expect, it } from 'vitest';
import { chatWindowSessionId } from '../src/shared/chat-window-query';

describe('chatWindowSessionId', () => {
  it('reads the popped-out chat from the page query', () => {
    expect(chatWindowSessionId('?chat=0a1b2c3d-4e5f')).toBe('0a1b2c3d-4e5f');
  });

  it('treats a page without a chat as the hub', () => {
    expect(chatWindowSessionId('')).toBeNull();
    expect(chatWindowSessionId('?other=1')).toBeNull();
  });

  it('treats an empty chat id as the hub', () => {
    expect(chatWindowSessionId('?chat=')).toBeNull();
  });
});
