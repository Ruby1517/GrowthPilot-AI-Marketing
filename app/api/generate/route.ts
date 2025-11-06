import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { assertPlan, PlanError } from '@/lib/plan'
import { generateContent } from '@/lib/generate'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { module, templateId, prompt, vars, schema } = await req.json()
  const orgId = (session.user as any).orgId as string | undefined

  try {
    await assertPlan(orgId, 'Starter')
  } catch (err) {
    if (err instanceof PlanError) {
      return NextResponse.json(
        { error: err.code, plan: err.plan, required: err.required },
        { status: err.status }
      )
    }
    throw err
  }

  if (!orgId) {
    return NextResponse.json({ error: 'org_not_found' }, { status: 404 })
  }

  const res = await generateContent({
    orgId,
    userId: (session.user as any).id,
    module,
    templateId,
    prompt,
    vars,
    jsonSchema: schema,
  })

  return NextResponse.json(res)
}
