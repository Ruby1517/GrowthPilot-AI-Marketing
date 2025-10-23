import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import BlogDoc from '@/models/BlogDoc';

export async function POST() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  await dbConnect();
  const me = await (await import('@/models/User')).default.findOne({ email: session.user.email }).lean();
  if (!me?._id) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const role = String((me as any).role || 'member');
  if (!['owner','admin'].includes(role)) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const outline = [
    'Overview of GrowthPilot plans',
    'Feature differences by module',
    'Usage meters and plan caps',
    'Overage pricing and invoicing',
    'When to upgrade',
  ];
  const draft = `# GrowthPilot Pricing Comparison\n\n` +
`This guide compares Starter, Pro, and Business plans and how they map to modules and usage caps.\n\n` +
`## Modules\n- PostPilot: Social posts (meter: posts)\n- ClipPilot: Render minutes (meter: clippilot_minutes)\n- BlogPilot: Words (meter: blogpilot_words)\n- AdPilot: Ad variants (meter: adpilot_variants)\n- LeadPilot: Conversations (meter: leadpilot_convos)\n- MailPilot: Emails (meter: mailpilot_emails)\n- BrandPilot: Assets (meter: brandpilot_assets)\n- ViralPilot: Render/watch minutes (meter: viralpilot_minutes)\n\n` +
`## Plan Caps\nEach plan defines caps per meter. When usage exceeds caps and overage is enabled, extra units incur charges based on the overage price per meter.\n\n` +
`## Overage\nOverage is recorded and invoiced. Admins can issue invoices from the dashboard.\n\n` +
`## Upgrade Guidance\nUpgrade when you consistently reach caps or need advanced modules.\n`;

  const doc = await BlogDoc.create({
    userId: me._id,
    meta: { title: 'GrowthPilot Pricing Comparison', description: 'Compare plans, caps, and overage' },
    outline,
    draft,
    tags: ['pricing','plans','growthpilot','comparison']
  });

  return NextResponse.json({ ok: true, id: String(doc._id) });
}
