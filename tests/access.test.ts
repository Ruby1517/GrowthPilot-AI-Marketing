import { describe, expect, it } from 'vitest';
import { canAccess } from '../lib/access';

describe('canAccess', () => {
  it('allows starter plan to use postpilot/blogpilot but not Pro modules', () => {
    expect(canAccess({ userPlan: 'Starter', module: 'postpilot' })).toBe(true);
    expect(canAccess({ userPlan: 'Starter', module: 'blogpilot' })).toBe(true);
    expect(canAccess({ userPlan: 'Starter', module: 'adpilot' })).toBe(false);
  });

  it('blocks unauthenticated users', () => {
    expect(canAccess({ userPlan: null, module: 'postpilot' })).toBe(false);
  });

  it('allows admin override when not on trial', () => {
    expect(canAccess({ userPlan: 'Pro', module: 'adpilot', userRole: 'admin' })).toBe(true);
    expect(canAccess({ userPlan: 'Trial', module: 'adpilot', userRole: 'admin' })).toBe(false);
  });
});
