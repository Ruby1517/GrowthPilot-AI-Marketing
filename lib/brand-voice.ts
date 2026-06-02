import type { BrandVoice } from '@/models/Org'

export function buildBrandVoicePrompt(bv?: BrandVoice | null): string {
  if (!bv || !Object.keys(bv).length) return ''

  const lines: string[] = ['--- Brand Voice (follow strictly) ---']

  if (bv.companyName)        lines.push(`Company: ${bv.companyName}`)
  if (bv.productDescription) lines.push(`Product/Service: ${bv.productDescription}`)
  if (bv.targetAudience)     lines.push(`Target audience: ${bv.targetAudience}`)
  if (bv.toneOfVoice)        lines.push(`Tone of voice: ${bv.toneOfVoice}`)
  if (bv.writingStyle)       lines.push(`Writing style: ${bv.writingStyle}`)
  if (bv.brandKeywords?.length)
    lines.push(`Must-use keywords/phrases: ${bv.brandKeywords.join(', ')}`)
  if (bv.bannedWords?.length)
    lines.push(`NEVER use these words or phrases: ${bv.bannedWords.join(', ')}`)
  if (bv.contentGoals?.length)
    lines.push(`Content goals: ${bv.contentGoals.join(', ')}`)
  if (bv.competitors?.length)
    lines.push(`Do not mention or praise these competitors: ${bv.competitors.join(', ')}`)

  lines.push('--- End Brand Voice ---')
  return lines.join('\n')
}
