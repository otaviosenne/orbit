import type WebSocket from 'ws';

// A phone that locks its screen or loses signal rarely closes its socket; one that misses a ping is let go, so it
// stops holding a slot and its voice connections.
export function startHeartbeat(socket: WebSocket, intervalMs: number): () => void {
  let isAlive: boolean = true;
  socket.on('pong', (): void => {
    isAlive = true;
  });
  const timer: NodeJS.Timeout = setInterval((): void => {
    if (!isAlive) return void socket.terminate();
    isAlive = false;
    socket.ping();
  }, intervalMs);
  return (): void => clearInterval(timer);
}
