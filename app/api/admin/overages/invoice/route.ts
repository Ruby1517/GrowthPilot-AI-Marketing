import { NextResponse } from 'next/server';
import { invoiceOveragesForOrg } from '@/jobs/overage-invoice';

export async function POST(req: Request) {
  const { orgId } = await req.json().catch(() => ({}));
  if (!orgId) return new Response('orgId required', { status: 400 });
  const res = await invoiceOveragesForOrg(orgId);
  return NextResponse.json(res);
}
