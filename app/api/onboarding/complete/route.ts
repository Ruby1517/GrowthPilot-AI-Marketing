export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { dbConnect } from '@/lib/db'
import User from '@/models/User'
import Org from '@/models/Org'
import OpenAI from 'openai'
import { buildOnboardingSystemPrompt, type BusinessType } from '@/lib/onboarding/templates'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.email) return new Response('Unauthorized', { status: 401 })

  await dbConnect()
  const me = await User.findOne({ email: session.user.email }).lean<{ _id: any; orgId?: any }>()
  if (!me) return new Response('User not found', { status: 404 })

  const body = await req.json().catch(() => ({}))
  const {
    businessType,
    businessName,
    city,
    differentiator,
    targetCustomers,
    goal,
    frequency,
  } = body as {
    businessType: BusinessType
    businessName: string
    city: string
    differentiator: string
    targetCustomers: string
    goal: string
    frequency: string
  }

  // Resolve org — create one if the user doesn't have one yet
  let org = me.orgId ? await Org.findById(me.orgId) : null
  if (!org) {
    org = await Org.create({
      name: businessName || 'My Business',
      plan: 'Trial',
      members: [{ userId: me._id, role: 'owner', joinedAt: new Date() }],
      usage: {},
      kpi: {},
    })
    await User.updateOne({ _id: me._id }, { $set: { orgId: org._id } })
  }

  // Save brand voice derived from onboarding answers
  const brandVoice = {
    toneOfVoice: 'friendly',
    // preserve any existing fields
    ...(org.brandVoice || {}),
    // then override with fresh onboarding data
    companyName: businessName,
    productDescription: differentiator,
    targetAudience: targetCustomers,
    contentGoals: [goal],
  }

  await Org.updateOne(
    { _id: org._id },
    {
      $set: {
        name: businessName || org.name,
        brandVoice,
        onboarded: true,
        // Store posting frequency in brandVoice for AutoPilot to read
        'brandVoice.postingFrequency': frequency,
        'brandVoice.businessType': businessType,
        'brandVoice.city': city,
      },
    }
  )

  // Generate 3 sample social posts
  let samplePosts: string[] = []
  const hasKey = Boolean(process.env.OPENAI_API_KEY)
  if (hasKey) {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      const systemPrompt = buildOnboardingSystemPrompt({
        businessType,
        businessName,
        city,
        differentiator,
        targetCustomers,
        goal,
      })

      const r = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.8,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Write 3 different social media posts for ${businessName} in ${city}.
Make them varied in style — one promotional, one educational/helpful, one community/personal.
Format as a JSON array of strings: ["post 1 text", "post 2 text", "post 3 text"]
Include emojis and hashtags. No markdown, just the JSON array.`,
          },
        ],
      })

      const raw = r.choices?.[0]?.message?.content?.trim() || ''
      const match = raw.match(/\[[\s\S]*\]/)
      if (match) {
        samplePosts = JSON.parse(match[0])
      }
    } catch {
      // If AI fails, fall back to static examples below
    }
  }

  // Static fallback if no AI key or generation failed
  if (samplePosts.length === 0) {
    samplePosts = [
      `🌟 Exciting things are happening at ${businessName}! Come visit us in ${city} and see why our customers keep coming back. ${goal === 'foot_traffic' ? '📍 Walk-ins welcome!' : '📅 Book your spot today!'} #${businessName.replace(/\s+/g, '')} #${city.replace(/\s+/g, '')}`,
      `💡 Did you know? ${differentiator}. That's what makes ${businessName} different — and why ${city} locals love us. #LocalBusiness #${city.replace(/\s+/g, '')}`,
      `👋 Hey ${city}! We're ${businessName} and we're here for ${targetCustomers}. Stop by and say hello — we'd love to meet you. #Community #SmallBusiness`,
    ]
  }

  return NextResponse.json({ ok: true, samplePosts })
}
