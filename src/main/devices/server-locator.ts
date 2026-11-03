import type { ChatServer } from '../../core/devices/dev-servers';
import { chatServers } from '../../core/devices/dev-servers';
import type { ListeningSocket } from '../../core/devices/listening-sockets';
import type { ListeningSocketReader } from './listening-socket-reader';
import { ProcessSessions } from './process-session';
import { procFacts } from './proc-facts';

// The ports a chat's commands listen on: dev servers, APIs, Metro, whether or not their shell is still around.
export class ServerLocator {
  private readonly sessions: ProcessSessions = new ProcessSessions();

  constructor(private readonly sockets: ListeningSocketReader) {}

  async serversOf(sessionId: string): Promise<ChatServer[]> {
    const sockets: ListeningSocket[] = await this.sockets.sockets();
    this.sessions.keepOnly(new Set(sockets.flatMap((socket: ListeningSocket) => socket.pids)));
    return chatServers(sockets, sessionId, {
      argv: procFacts.argv,
      cwd: procFacts.cwd,
      sessionOf: (pid: number): Promise<string | null> => this.sessions.sessionOf(pid),
    });
  }
}
