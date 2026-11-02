import { describe, expect, it } from 'vitest';
import { mergeTunnelHosts, parseTunnelHosts } from '../src/core/devices/tunnel-hosts';
import { publicUrlOf } from '../src/core/devices/public-url';

const CONFIG: string = `tunnel: 00000000-0000-0000-0000-000000000000
credentials-file: /etc/cloudflared/tunnel.json

ingress:
  - hostname: shop.example.com
    service: http://localhost:3000
  - hostname: 3000.example.com
    service: http://localhost:3000
  - hostname: 8081.example.com
    service: http://localhost:8081
  - hostname: photos.example.com
    service: http://127.0.0.1:2283
    originRequest:
      disableChunkedEncoding: true
  - hostname: health.example.com
    service: http_status:200
  - service: http_status:404
`;

describe('tunnel hosts', () => {
  it('reads each published port, preferring the name made of the port', () => {
    const hosts: Map<number, string> = parseTunnelHosts(CONFIG);
    expect(hosts.get(3000)).toBe('https://3000.example.com');
    expect(hosts.get(8081)).toBe('https://8081.example.com');
    expect(hosts.get(2283)).toBe('https://photos.example.com');
    expect(hosts.size).toBe(3);
  });

  it('never gives a rule without a hostname the previous rule\'s name', () => {
    const hosts: Map<number, string> = parseTunnelHosts('ingress:\n  - hostname: a.example.com\n    service: http_status:200\n  - service: http://localhost:9000\n');
    expect(hosts.has(9000)).toBe(false);
  });

  it('lets the first config win a port both publish, and reads nothing from an empty one', () => {
    const merged: Map<number, string> = mergeTunnelHosts(['', '  - hostname: 8081.other.com\n    service: http://localhost:8081\n', CONFIG]);
    expect(merged.get(8081)).toBe('https://8081.other.com');
    expect(merged.get(3000)).toBe('https://3000.example.com');
  });
});

describe('public url', () => {
  const hosts: Map<number, string> = parseTunnelHosts(CONFIG);

  it('turns a page on a published local port into its tunnel address, keeping path, query and hash', () => {
    expect(publicUrlOf('http://localhost:3000/orders/7?tab=items#total', hosts)).toBe('https://3000.example.com/orders/7?tab=items#total');
    expect(publicUrlOf('http://127.0.0.1:8081/', hosts)).toBe('https://8081.example.com/');
    expect(publicUrlOf('http://app.localhost:3000/x', hosts)).toBe('https://3000.example.com/x');
  });

  it('keeps a page that is already on the web, and gives up on an unpublished port or a browser page', () => {
    expect(publicUrlOf('https://github.com/acme/app/pull/3', hosts)).toBe('https://github.com/acme/app/pull/3');
    expect(publicUrlOf('http://localhost:5173/checkout', hosts)).toBeNull();
    expect(publicUrlOf('chrome://newtab/', hosts)).toBeNull();
    expect(publicUrlOf(null, hosts)).toBeNull();
    expect(publicUrlOf('not a url', hosts)).toBeNull();
  });
});
