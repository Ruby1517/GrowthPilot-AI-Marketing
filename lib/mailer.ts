import nodemailer from 'nodemailer';

export function mailerConfigured() {
  const sg = !!process.env.SENDGRID_API_KEY;
  const smtp = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  return { sg, smtp, any: sg || smtp };
}

export async function sendSMTP(to: string, subject: string, html: string, text?: string) {
  const { smtp } = mailerConfigured();
  if (!smtp) throw new Error('SMTP not configured');
  const host = process.env.SMTP_HOST!;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER!;
  const pass = process.env.SMTP_PASS!;
  const from = process.env.FROM_EMAIL || 'GrowthPilot <noreply@example.com>';

  const transport = nodemailer.createTransport({ host, port, auth: { user, pass } });
  return transport.sendMail({ from, to, subject, html, text });
}

export async function sendSendGrid(to: string, subject: string, html: string, text?: string) {
  const key = process.env.SENDGRID_API_KEY;
  if (!key) throw new Error('SendGrid not configured (SENDGRID_API_KEY missing)');

  // FROM can be "Name <email@domain.com>" or just "email@domain.com"
  const rawFrom = process.env.FROM_EMAIL || 'GrowthPilot <noreply@example.com>';
  const fromEmail = rawFrom.match(/<(.*)>/)?.[1] || rawFrom; // extract email if "Name <email>"
  const fromName  = rawFrom.includes('<') ? rawFrom.replace(/<.*>/,'').trim() : undefined;

  // quick validations to avoid 400s
  if (!fromEmail || !fromEmail.includes('@')) {
    throw new Error(`Invalid FROM_EMAIL "${rawFrom}". It must be an authenticated sender (Single Sender) or on a verified domain.`);
  }
  if (!to || !to.includes('@')) {
    throw new Error(`Invalid "to" address: "${to}"`);
  }
  if (!subject || !subject.trim()) {
    throw new Error('Subject is required for SendGrid');
  }
  if (!html && !text) {
    throw new Error('At least one of HTML or text content must be provided');
  }

  const payload: any = {
    personalizations: [{ to: [{ email: to }], subject }],
    from: fromName ? { email: fromEmail, name: fromName } : { email: fromEmail },
    content: [],
  };
  if (text) payload.content.push({ type: 'text/plain', value: text });
  if (html) payload.content.push({ type: 'text/html',  value: html });

  // Optional: sandbox mode for testing without sending
  if (process.env.SENDGRID_SANDBOX === 'true') {
    payload.mail_settings = { sandbox_mode: { enable: true } };
  }

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    // Read detailed error from SendGrid (very helpful!)
    const textBody = await res.text().catch(() => '');
    let reason = textBody;
    try {
      const j = JSON.parse(textBody);
      // SendGrid standard error shape
      if (j?.errors?.length) reason = j.errors.map((e: any) => e.message || e).join(' | ');
    } catch { /* keep textBody */ }
    throw new Error(`SendGrid failed ${res.status}: ${reason || res.statusText}`);
  }

  return true;
}
