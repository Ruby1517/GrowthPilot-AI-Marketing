import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  openAiCreateMock,
  usageCreateMock,
  authMock,
  userFindMock,
  assertWithinLimitMock,
  recordOverageRowMock,
  trackMock,
} = vi.hoisted(() => ({
  openAiCreateMock: vi.fn(),
  usageCreateMock: vi.fn(async () => ({})),
  authMock: vi.fn(),
  userFindMock: vi.fn(() => ({ lean: () => Promise.resolve({ _id: 'userDoc1', orgId: 'org1' }) })),
  assertWithinLimitMock: vi.fn(async () => ({ ok: true })),
  recordOverageRowMock: vi.fn(async () => {}),
  trackMock: vi.fn(async () => {}),
}));

vi.mock('openai', () => ({
  default: class OpenAI {
    chat = { completions: { create: openAiCreateMock } };
  },
}));

vi.mock('@/lib/auth', () => ({
  auth: (...args: any[]) => authMock(...args),
}));

vi.mock('@/lib/db', () => ({
  dbConnect: vi.fn(async () => {}),
}));

vi.mock('@/models/User', () => ({
  __esModule: true,
  default: {
    findOne: userFindMock,
  },
}));

vi.mock('@/models/Usage', () => ({
  __esModule: true,
  default: {
    create: usageCreateMock,
  },
}));

vi.mock('@/lib/usage', () => ({
  assertWithinLimit: (...args: any[]) => assertWithinLimitMock(...args),
}));

vi.mock('@/lib/overage', () => ({
  recordOverageRow: (...args: any[]) => recordOverageRowMock(...args),
}));

vi.mock('@/lib/track', () => ({
  track: (...args: any[]) => trackMock(...args),
}));

import { POST } from '@/app/api/mailpilot/generate/route';

describe('MailPilot API', () => {
  beforeEach(() => {
    openAiCreateMock.mockReset();
    usageCreateMock.mockClear();
    authMock.mockReset();
    userFindMock.mockClear();
    assertWithinLimitMock.mockClear();
    recordOverageRowMock.mockClear();
    trackMock.mockClear();
    process.env.OPENAI_API_KEY = 'test-key';
    authMock.mockResolvedValue({ user: { email: 'tester@example.com', id: 'user1' } });
  });

  it('rejects unauthenticated requests', async () => {
    authMock.mockResolvedValueOnce(null);
    const req = new Request('http://test/mailpilot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'newsletter', steps: 1 }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(401);
    expect(openAiCreateMock).not.toHaveBeenCalled();
  });

  it('returns generated emails and tracks usage', async () => {
    const mockOutput = {
      mergeVars: ['first_name', 'offer'],
      emails: [
        {
          step: 1,
          delayDays: 0,
          subjectA: 'Hello',
          subjectB: 'Hi',
          preheader: 'Preview',
          html: '<p>Body {{first_name}}</p>',
        },
      ],
    };
    openAiCreateMock.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(mockOutput) } }],
      usage: { total_tokens: 1234 },
    });

    const req = new Request('http://test/mailpilot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'newsletter', steps: 1 }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.result.emails).toHaveLength(1);
    expect(json.result.spam.score).toBeGreaterThanOrEqual(0);
    expect(assertWithinLimitMock).toHaveBeenCalledWith(expect.objectContaining({ incBy: 1, key: 'mailpilot_emails' }));
    expect(usageCreateMock).toHaveBeenCalledWith(expect.objectContaining({ amount: 1234 }));
    expect(trackMock).toHaveBeenCalledWith('org1', 'user1', expect.any(Object));
  });
});
