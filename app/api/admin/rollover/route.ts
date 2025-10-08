// app/api/admin/rollover/route.ts
import { NextResponse } from 'next/server';
import { rolloverOrgs } from '@/jobs/rollover';

export async function POST() {
  const res = await rolloverOrgs();
  return NextResponse.json(res);
}
