import { auth } from '@/lib/auth'
import { assertPlan } from '@/lib/plan'
import { generateContent } from '@/lib/generate'
export async function POST(req: Request){ const session = await auth(); if(!session?.user) return new Response('Unauthorized',{status:401}); const { module, templateId, prompt, vars, schema } = await req.json(); const orgId = (session.user as any).orgId as string; await assertPlan(orgId,'starter'); const res = await generateContent({ orgId, userId: (session.user as any).id, module, templateId, prompt, vars, jsonSchema: schema }); return Response.json(res) }