import { describe, expect, it } from 'vitest';
import { normalizeExternalUrl } from '../../src/main/remote/external-url';
import { isTrustedHost, isTrustedOrigin, trustedOrigins } from '../../src/main/remote/trusted-origins';
import type { TrustedOrigins } from '../../src/main/remote/trusted-origins';

describe('trusted origins', () => {
  const trusted: TrustedOrigins = trustedOrigins(4517, 'https://orbit.example.com');

  it('accepts the local address and the external URL', () => {
    expect(isTrustedOrigin(trusted, 'http://127.0.0.1:4517')).toBe(true);
    expect(isTrustedOrigin(trusted, 'http://localhost:4517')).toBe(true);
    expect(isTrustedOrigin(trusted, 'https://orbit.example.com')).toBe(true);
  });

  it('refuses other sites, other ports, plain http for the external URL and a missing origin', () => {
    expect(isTrustedOrigin(trusted, 'https://evil.example')).toBe(false);
    expect(isTrustedOrigin(trusted, 'http://127.0.0.1:9999')).toBe(false);
    expect(isTrustedOrigin(trusted, 'http://orbit.example.com')).toBe(false);
    expect(isTrustedOrigin(trusted, 'null')).toBe(false);
    expect(isTrustedOrigin(trusted, undefined)).toBe(false);
  });

  it('answers only to its own host names, which stops DNS rebinding', () => {
    expect(isTrustedHost(trusted, '127.0.0.1:4517')).toBe(true);
    expect(isTrustedHost(trusted, 'orbit.example.com')).toBe(true);
    expect(isTrustedHost(trusted, 'ORBIT.example.com')).toBe(true);
    expect(isTrustedHost(trusted, 'rebind.attacker.example:4517')).toBe(false);
    expect(isTrustedHost(trusted, undefined)).toBe(false);
  });

  it('trusts only the local address without an external URL', () => {
    expect(trustedOrigins(4517, '').origins.size).toBe(2);
  });
});

describe('normalizeExternalUrl', () => {
  it('keeps only the origin of a web address', () => {
    expect(normalizeExternalUrl(' https://orbit.example.com/some/path?x=1 ')).toBe('https://orbit.example.com');
    expect(normalizeExternalUrl('')).toBe('');
  });

  it('refuses anything that is not plain http(s)', () => {
    for (const input of ['ftp://x.example', 'javascript:alert(1)', 'not a url', 'https://user:pass@x.example']) {
      expect(normalizeExternalUrl(input)).toBeNull();
    }
  });
});
