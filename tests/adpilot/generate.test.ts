import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  openAiCreateMock,
  assertWithinLimitMock,
  recordOverageRowMock,
  trackMock,
} = vi.hoisted(() => ({
  openAiCreateMock: vi.fn(),
  assertWithinLimitMock: vi.fn(async () => ({ ok: true })),
  recordOverageRowMock: vi.fn(async () => {}),
  trackMock: vi.fn(async () => {}),
}));

vi.mock('openai', () => {
  return {
    default: class OpenAI {
      chat = { completions: { create: openAiCreateMock } };
    },
  };
});

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(async () => ({ user: { email: 'tester@example.com', id: 'user1' } })),
}));

vi.mock('@/lib/db', () => ({
  dbConnect: vi.fn(async () => {}),
}));

vi.mock('@/models/Org', () => ({
  __esModule: true,
  default: {
    findById: vi.fn(() => ({
      lean: () => Promise.resolve({ _id: 'org1', plan: 'Pro' }),
    })),
  },
}));

vi.mock('@/models/User', () => ({
  __esModule: true,
  default: {
    findOne: vi.fn(() => ({
      lean: () => Promise.resolve({ _id: 'userDoc1', orgId: 'org1' }),
    })),
  },
}));

vi.mock('@/lib/ratelimit', () => ({
  safeLimitPerOrg: vi.fn(async () => ({ success: true, limit: 100, remaining: 99, reset: 0 })),
}));

vi.mock('@/lib/usage', () => ({
  assertWithinLimit: assertWithinLimitMock,
}));

vi.mock('@/lib/overage', () => ({
  recordOverageRow: recordOverageRowMock,
}));

vi.mock('@/lib/track', () => ({
  track: trackMock,
}));

import { POST } from '@/app/api/adpilot/generate/route';

describe('AdPilot API', () => {
  beforeEach(() => {
    openAiCreateMock.mockReset();
    assertWithinLimitMock.mockClear();
    recordOverageRowMock.mockClear();
    trackMock.mockClear();
    process.env.OPENAI_API_KEY = 'test-key';
  });

  it('returns 400 when offer and url missing', async () => {
    const req = new Request('http://test/adpilot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Provide an offer');
  });

  it('returns structured payload for valid request', async () => {
    const mockPayload = {
      platforms: {
        meta: [
          sampleVariant('meta', 'A'),
          sampleVariant('meta', 'B'),
        ],
        google: [
          sampleVariant('google', 'A'),
          sampleVariant('google', 'B'),
        ],
        tiktok: [
          sampleVariant('tiktok', 'A'),
          sampleVariant('tiktok', 'B'),
        ],
        youtube: [
          sampleVariant('youtube', 'A'),
          sampleVariant('youtube', 'B'),
        ],
      },
      retargeting: {
        summary: 'Warm audiences summary',
        ads: [
          { headline: 'Come back', body: 'Finish checkout', cta: 'Complete', audience: 'Abandoners', schedule: 'Day 0' },
          { headline: 'Still here', body: 'Bonus ends soon', cta: 'Return', audience: 'Visitors', schedule: 'Day 3' },
        ],
      },
      lookalikeIdeas: ['High LTV buyers', 'Email engagers'],
      creativeConcepts: [
        { platform: 'meta', concepts: ['Carousel idea', 'Testimonial story'], videoScript: 'Hook -> Value -> CTA' },
        { platform: 'tiktok', concepts: ['POV video', 'Creator duet'], videoScript: 'Hook -> Demo -> CTA' },
      ],
      testPlan: '- Run multi-platform test\n- Promote winners',
    };

    openAiCreateMock.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(mockPayload) } }],
    });

    const req = new Request('http://test/adpilot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offer: 'New product launch' }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.result.platforms.meta).toHaveLength(2);
    expect(json.result.platforms.tiktok[0].hook.length).toBeGreaterThan(0);
    expect(json.result.retargeting.ads.length).toBeGreaterThan(1);
    expect(assertWithinLimitMock).toHaveBeenCalledWith(expect.objectContaining({ incBy: 8 }));
    expect(trackMock).toHaveBeenCalled();
  });
});

type PlatformKey = 'meta'|'google'|'tiktok'|'youtube';
type PlatformVariant = {
  platform: PlatformKey;
  variant: 'A'|'B'|'C';
  angle: string;
  hook: string;
  primaryText: string;
  headlines: string[];
  descriptions: string[];
  cta: string;
  audience: string;
  creativeIdeas: string[];
  videoScript?: string;
  utm: { source: string; medium: string; campaign: string; content: string; term?: string };
};

function sampleVariant(platform: PlatformKey, variant: 'A'|'B'|'C'): PlatformVariant {
  return {
    platform,
    variant,
    angle: `${platform} angle ${variant}`,
    hook: `Hook for ${platform} ${variant}`,
    primaryText: `Primary text for ${platform} ${variant}`,
    headlines: ['Headline 1', 'Headline 2'],
    descriptions: ['Desc 1', 'Desc 2'],
    cta: 'Learn More',
    audience: 'Broad interest + lookalike',
    creativeIdeas: ['Idea 1', 'Idea 2', 'Idea 3'],
    videoScript: 'Hook -> Benefit -> CTA',
    utm: {
      source: platform,
      medium: 'cpc',
      campaign: `${platform}_campaign_${variant.toLowerCase()}`,
      content: `${platform}_angle_${variant.toLowerCase()}`,
      term: '',
    },
  };
}
