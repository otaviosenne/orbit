import { describe, expect, it } from 'vitest';
import { explainVoiceFailure } from '../src/main/voice-failure';

describe('explainVoiceFailure', () => {
  it('names a billing problem from the status or the service words', () => {
    expect(explainVoiceFailure('Voice service refused the connection (HTTP 402)')).toContain('Billing');
    expect(explainVoiceFailure('insufficient_credits')).toContain('Billing');
  });

  it('names an expired login and a rate limit', () => {
    expect(explainVoiceFailure('Voice service refused the connection (HTTP 401)')).toContain('login');
    expect(explainVoiceFailure('Unexpected server response: 429')).toContain('Too many');
  });

  it('leaves other failures as they are', () => {
    expect(explainVoiceFailure('socket hang up')).toBe('socket hang up');
  });
});
