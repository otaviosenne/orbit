// The browsers dictating right now, never more than capacity: each one holds microphone audio and voice-service
// connections, so a stray script or a pile of half-dead phone sockets cannot pile them up.
export class ClientRegistry<T> {
  private readonly clients: Set<T> = new Set();

  constructor(private readonly capacity: number) {}

  get hasRoom(): boolean {
    return this.clients.size < this.capacity;
  }

  get size(): number {
    return this.clients.size;
  }

  admit(client: T): boolean {
    if (!this.hasRoom) return false;
    this.clients.add(client);
    return true;
  }

  remove(client: T): void {
    this.clients.delete(client);
  }

  // Empties the registry and hands back who was in it, for the caller to hang up on.
  drain(): T[] {
    const all: T[] = [...this.clients];
    this.clients.clear();
    return all;
  }
}
