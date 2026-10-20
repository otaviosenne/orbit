import { chatWindowSessionId } from '../shared/chat-window-query';

type ChatWindowModule = typeof import('./chat-window/chat-window');

// The hub module starts its board and polling as soon as it loads, so a popped-out chat must never load it.
const sessionId: string | null = chatWindowSessionId(window.location.search);
if (sessionId === null) void import('./app');
else void import('./chat-window/chat-window').then((module: ChatWindowModule): void => module.startChatWindow(sessionId));
