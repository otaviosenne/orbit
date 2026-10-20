import { describe, expect, it } from 'vitest';
import { PendingSettings } from '../src/renderer/sheet/settings/pending-settings';

const OPUS_HIGH = { model: 'claude-opus-5-5', effort: 'high' } as const;

describe('PendingSettings', () => {
  it('shows a pick until the chat reports it, in any spelling', () => {
    const pending: PendingSettings = new PendingSettings();
    pending.set('s1', 'model', 'sonnet', OPUS_HIGH.model, 0);
    expect(pending.apply('s1', OPUS_HIGH, 1000).model).toBe('sonnet');
    expect(pending.apply('s1', { ...OPUS_HIGH, model: 'claude-sonnet-5-5' }, 2000).model).toBe('claude-sonnet-5-5');
    // Confirmed picks are forgotten, so a later change in the terminal shows as is.
    expect(pending.apply('s1', OPUS_HIGH, 3000).model).toBe('claude-opus-5-5');
    expect(pending.hasPending('s1')).toBe(false);
  });

  it('reports a pick still on its way, only for its own chat', () => {
    const pending: PendingSettings = new PendingSettings();
    pending.set('s1', 'effort', 'low', 'high', 0);
    pending.apply('s1', OPUS_HIGH, 1000);
    expect(pending.hasPending('s1')).toBe(true);
    expect(pending.hasPending('s2')).toBe(false);
  });

  it('gives way to whatever the chat answers, such as a capped effort', () => {
    const pending: PendingSettings = new PendingSettings();
    pending.set('s1', 'effort', 'max', 'high', 0);
    expect(pending.apply('s1', OPUS_HIGH, 1000).effort).toBe('max');
    expect(pending.apply('s1', { ...OPUS_HIGH, effort: 'xhigh' }, 2000).effort).toBe('xhigh');
  });

  it('drops a pick that was not delivered and gives up after the time limit', () => {
    const pending: PendingSettings = new PendingSettings();
    pending.set('s1', 'effort', 'low', 'high', 0);
    pending.set('s1', 'model', 'haiku', OPUS_HIGH.model, 0);
    pending.drop('s1', 'effort');
    expect(pending.apply('s1', OPUS_HIGH, 1000)).toEqual({ model: 'haiku', effort: 'high' });
    expect(pending.apply('s1', OPUS_HIGH, 60_000)).toEqual(OPUS_HIGH);
  });

  it('overlays a permission mode until the footer shows it', () => {
    const pending: PendingSettings = new PendingSettings();
    pending.set('s1', 'permissionMode', 'plan', 'bypassPermissions', 0);
    expect(pending.applyMode('s1', 'bypassPermissions', 1000)).toBe('plan');
    expect(pending.hasPending('s1')).toBe(true);
    expect(pending.applyMode('s1', 'plan', 2000)).toBe('plan');
    expect(pending.hasPending('s1')).toBe(false);
  });
});
