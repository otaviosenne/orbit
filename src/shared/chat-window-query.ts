// A popped-out chat window loads the same page as the hub, with the chat's session id in this query parameter.
export const CHAT_WINDOW_QUERY_KEY: string = 'chat';

// Null means the page is the hub.
export function chatWindowSessionId(search: string): string | null {
  const sessionId: string | null = new URLSearchParams(search).get(CHAT_WINDOW_QUERY_KEY);
  return sessionId === null || sessionId.length === 0 ? null : sessionId;
}
