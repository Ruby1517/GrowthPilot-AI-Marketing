export type BusinessType =
  | 'restaurant' | 'clinic' | 'salon' | 'auto'
  | 'retail' | 'fitness' | 'realestate' | 'other'

export const BUSINESS_TYPE_META: Record<BusinessType, { label: string; icon: string; desc: string }> = {
  restaurant:  { label: 'Restaurant / Café',    icon: '🍽️',  desc: 'Food service, cafés, bars, bakeries' },
  clinic:      { label: 'Clinic / Med Spa',     icon: '🏥',  desc: 'Medical, dental, therapy, wellness' },
  salon:       { label: 'Salon / Beauty',       icon: '💇',  desc: 'Hair, nails, aesthetics, barbershop' },
  auto:        { label: 'Auto Shop',            icon: '🔧',  desc: 'Repair, detailing, tires, body work' },
  retail:      { label: 'Retail / Boutique',    icon: '🛍️',  desc: 'Clothing, gifts, specialty stores' },
  fitness:     { label: 'Fitness / Studio',     icon: '💪',  desc: 'Gym, yoga, martial arts, dance' },
  realestate:  { label: 'Real Estate',          icon: '🏠',  desc: 'Agents, property management, brokers' },
  other:       { label: 'Other Business',       icon: '🏢',  desc: 'Professional services, contractors, more' },
}

export const GOAL_META = {
  foot_traffic:  { label: 'More foot traffic',            icon: '🚶', desc: 'Get more people walking through the door' },
  online_orders: { label: 'Online orders / bookings',     icon: '📱', desc: 'Drive online sales or appointment bookings' },
  new_clients:   { label: 'Attract new clients',          icon: '🤝', desc: 'Grow your customer base' },
  retention:     { label: 'Keep regulars coming back',    icon: '💛', desc: 'Loyalty and repeat business' },
}

export const FREQUENCY_META = {
  daily:    { label: 'Daily', sub: 'Best for restaurants and high-volume businesses' },
  '3x':     { label: '3× per week', sub: 'Recommended for most local businesses' },
  weekly:   { label: 'Weekly', sub: 'Good starting point for busier owners' },
}

// System prompt context per business type
export const BUSINESS_CONTENT_GUIDE: Record<BusinessType, string> = {
  restaurant: `Content mix: 40% food/menu showcases, 30% behind-the-scenes kitchen & team, 20% promotions & specials, 10% community & local events.
Tone: warm, inviting, sensory. Use mouth-watering descriptions. Mention flavors, textures, aromas.
Post ideas: daily specials, new menu items, chef spotlights, happy hour promos, seasonal dishes, customer favorites, holiday hours.`,

  clinic: `Content mix: 40% educational health tips, 30% service spotlights, 20% team & culture, 10% patient milestones (with consent).
Tone: professional, caring, reassuring. Use plain language, avoid medical jargon.
Post ideas: health awareness days, service explanations, FAQs, seasonal wellness tips, team introductions, appointment reminders, before/after (with consent).`,

  salon: `Content mix: 40% before/after transformations, 30% services & pricing, 20% tips & trends, 10% team spotlights.
Tone: stylish, confident, fun. Use color, texture, and trend vocabulary.
Post ideas: hair color transformations, nail art, styling tips, seasonal looks, new staff, product recommendations, booking CTAs.`,

  auto: `Content mix: 40% maintenance tips & reminders, 30% service spotlights, 20% team & shop culture, 10% local community.
Tone: trustworthy, knowledgeable, no-nonsense. Educate without being condescending.
Post ideas: seasonal maintenance reminders (oil change, tires, AC), service explainers, car care tips, common mistakes, team spotlights, before/after repair photos.`,

  retail: `Content mix: 40% product showcases, 30% promotions & sales, 20% styling/use inspiration, 10% community & local.
Tone: aspirational but accessible. Show lifestyle and use cases, not just products.
Post ideas: new arrivals, styling ideas, gift guides, flash sales, customer photos, behind the scenes, local partnerships.`,

  fitness: `Content mix: 40% motivation & tips, 30% class/program spotlights, 20% member transformations, 10% schedule & offers.
Tone: energetic, encouraging, community-focused. Celebrate wins of all sizes.
Post ideas: workout tips, class schedules, member spotlights, challenges, nutrition basics, new equipment, trainer introductions, trial offer CTAs.`,

  realestate: `Content mix: 30% listings, 30% market insights, 25% local neighborhood content, 15% client success stories.
Tone: expert but approachable. Position as the trusted local market guide.
Post ideas: new listings, sold properties, neighborhood highlights, market stats, buying/selling tips, local business spotlights, client testimonials.`,

  other: `Content mix: 40% value/expertise showcases, 30% service spotlights, 20% team & culture, 10% local community.
Tone: professional, helpful, genuine. Lead with value before promotion.
Post ideas: tips from your expertise, service spotlights, team introductions, community involvement, FAQs, testimonials, seasonal offers.`,
}

export function buildOnboardingSystemPrompt(params: {
  businessType: BusinessType
  businessName: string
  city: string
  differentiator: string
  targetCustomers: string
  goal: string
}): string {
  const guide = BUSINESS_CONTENT_GUIDE[params.businessType]
  const goalLabel = GOAL_META[params.goal as keyof typeof GOAL_META]?.label ?? params.goal

  return `You are a social media marketing expert for local businesses.

Business: ${params.businessName}
Location: ${params.city}
Type: ${BUSINESS_TYPE_META[params.businessType].label}
What makes them different: ${params.differentiator}
Target customers: ${params.targetCustomers}
Primary goal: ${goalLabel}

Content strategy:
${guide}

Write social media posts that feel authentic, local, and speak directly to ${params.targetCustomers}.
Each post should help achieve the goal: ${goalLabel}.
Keep posts concise (under 220 characters for the main copy), add 3-5 relevant hashtags, and include a clear call-to-action where natural.`
}
