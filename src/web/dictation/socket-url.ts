import { DICTATION_SOCKET_PATH } from '../../shared/dictation-protocol';

// Same host as the page, so the session cookie rides along; wss behind HTTPS (the tunnel), ws on the local address.
export function dictationSocketUrl(location: Pick<Location, 'protocol' | 'host'>): string {
  const scheme: string = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${scheme}//${location.host}${DICTATION_SOCKET_PATH}`;
}
