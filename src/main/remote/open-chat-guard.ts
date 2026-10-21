import type { RemoteRoutes } from './remote-context';

// A 'chat' channel acts on the process its first argument names, so it must be one of the chats Orbit lists right
// now, never just any pid on the machine.
export async function isOpenChatPid(routes: RemoteRoutes, pid: unknown): Promise<boolean> {
  if (typeof pid !== 'number') return false;
  const chats: unknown = await routes.GetChats();
  return Array.isArray(chats) && chats.some((chat: unknown) => hasPid(chat, pid));
}

function hasPid(chat: unknown, pid: number): boolean {
  return typeof chat === 'object' && chat !== null && (chat as Record<string, unknown>)['pid'] === pid;
}
