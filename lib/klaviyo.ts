type Audience = { type: 'list' | 'segment'; id: string };

const API_BASE = process.env.KLAVIYO_API_BASE || 'https://a.klaviyo.com/api';
const API_REVISION = process.env.KLAVIYO_API_REVISION || '2024-05-15';

async function klaviyoRequest(path: string, init: RequestInit = {}) {
  const key = process.env.KLAVIYO_API_KEY;
  if (!key) throw new Error('KLAVIYO_API_KEY is not configured');
  const headers = {
    Authorization: `Klaviyo-API-Key ${key}`,
    Revision: API_REVISION,
    'Content-Type': 'application/json',
    ...(init.headers || {}),
  };
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Klaviyo API ${res.status}: ${text || res.statusText}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function createCampaign(name: string, audiences: Audience[]) {
  return klaviyoRequest('/campaigns/', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        type: 'campaign',
        attributes: {
          name,
          channel: 'EMAIL',
        },
        relationships: {
          audiences: {
            data: audiences,
          },
        },
      },
    }),
  });
}

async function createCampaignMessage(opts: {
  campaignId: string;
  subject: string;
  preheader?: string;
  html: string;
  text?: string;
  fromEmail: string;
  fromName?: string;
}) {
  return klaviyoRequest('/campaign-messages/', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        type: 'campaign-message',
        attributes: {
          name: opts.subject.slice(0, 60),
          send_strategy: 'SCHEDULED',
          content: {
            subject: opts.subject,
            preview_text: opts.preheader || '',
            from_email: opts.fromEmail,
            from_name: opts.fromName || opts.fromEmail,
            html: opts.html,
            text: opts.text || '',
          },
        },
        relationships: {
          campaign: {
            data: { type: 'campaign', id: opts.campaignId },
          },
        },
      },
    }),
  });
}

async function scheduleCampaignMessage(messageId: string, sendAtIso: string) {
  return klaviyoRequest(`/campaign-messages/${messageId}/schedules/`, {
    method: 'POST',
    body: JSON.stringify({
      data: {
        type: 'campaign-message-schedule',
        attributes: {
          schedule_type: 'SCHEDULED',
          send_time: sendAtIso,
        },
      },
    }),
  });
}

type SequenceEmail = {
  step: number;
  subject: string;
  preheader?: string;
  html: string;
  text?: string;
  sendAt: string;
  variant?: 'A' | 'B';
};

type PushSequenceArgs = {
  sequenceName: string;
  listId?: string;
  segmentId?: string;
  sender: {
    sender_name?: string;
    sender_company?: string;
    sender_email: string;
  };
  emails: SequenceEmail[];
};

export async function pushKlaviyoSequence(opts: PushSequenceArgs) {
  if (!opts.listId && !opts.segmentId) {
    throw new Error('listId or segmentId is required');
  }
  if (!opts.emails?.length) throw new Error('No emails to schedule');
  const audiences: Audience[] = [];
  if (opts.segmentId) audiences.push({ type: 'segment', id: opts.segmentId });
  if (opts.listId) audiences.push({ type: 'list', id: opts.listId });

  const created: Array<{ step: number; campaignId: string; messageId: string }> = [];
  for (const email of opts.emails) {
    const campaignName = `${opts.sequenceName} • Step ${email.step}`;
    const campaign = await createCampaign(campaignName, audiences);
    const campaignId = campaign?.data?.id;
    if (!campaignId) throw new Error('Failed to create campaign');
    const msg = await createCampaignMessage({
      campaignId,
      subject: email.subject,
      preheader: email.preheader,
      html: email.html,
      text: email.text,
      fromEmail: opts.sender.sender_email,
      fromName: opts.sender.sender_name || opts.sender.sender_company || opts.sender.sender_email,
    });
    const messageId = msg?.data?.id;
    if (!messageId) throw new Error('Failed to create campaign message');
    await scheduleCampaignMessage(messageId, email.sendAt);
    created.push({ step: email.step, campaignId, messageId });
  }

  return created;
}
