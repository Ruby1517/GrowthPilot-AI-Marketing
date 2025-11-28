import { z } from 'zod'
import { renderTemplate } from './render'
import { safetyCheck } from './safety'
import { checkRateLimit } from './ratelimit'
import { addUsage } from './costs'
import { trackEvent } from './events'
import Template from '@/models/Template'
import Generation from '@/models/Generation'
import { dbConnect } from './db'

type Provider = 'openai'|'mock'
const OutputSchema = z.any()

async function callProvider(provider:Provider, prompt:string){ if(provider==='openai' && process.env.OPENAI_API_KEY){ const { OpenAI } = await import('openai'); const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); const resp = await client.chat.completions.create({ model: 'gpt-4o-mini', messages:[{role:'system',content:'You are a helpful content generator.'},{role:'user',content:prompt}], temperature:0.7 }); const text = resp.choices[0]?.message?.content || ''; const tokens = (resp.usage?.total_tokens as number) || 0; return { text, tokens } } return { text: `MOCK OUTPUT => ${prompt.slice(0,160)}...`, tokens: Math.ceil(prompt.length/3) } }

export async function generateContent({ orgId, userId, module, templateId, prompt, vars = {}, jsonSchema }:{ orgId:string, userId:string, module:'post'|'clip'|'blog'|'ad'|'lead'|'mail'|'brand', templateId?:string, prompt?:string, vars?:Record<string,any>, jsonSchema?:any }){
  await dbConnect()
  const limits:Record<string,number>={ post:60, clip:20, blog:20, ad:60, lead:60, mail:60, brand:30 }
  const rl = await checkRateLimit(orgId, module, limits[module]||30, 60)
  if(!rl.ok){ return { ok:false, error:'rate_limited', remaining:0 } }

  let usedPrompt = prompt || ''; let usedSchema = jsonSchema
  if(templateId){ const tpl = await Template.findById(templateId); if(!tpl) return { ok:false, error:'template_not_found' }; usedPrompt = tpl.prompt || usedPrompt; usedSchema = usedSchema || tpl.schema }
  if(!usedPrompt) return { ok:false, error:'missing_prompt' }

  const rendered = renderTemplate(usedPrompt, vars)
  const inSafety = safetyCheck(JSON.stringify(vars)+'\n'+rendered)
  if(!inSafety.ok){ return { ok:false, error:'safety_failed', reasons: inSafety.reasons } }

  const gen = await Generation.create({ orgId, userId, module, templateId: templateId||null, input: { vars, prompt: usedPrompt }, status: 'running', events:[{type:'requested', at:new Date(), meta:{}}], safety:{ok:true, reasons:[]} })
  await trackEvent({ orgId, userId, module, type: 'generation.requested', meta: { generationId: gen._id } })

  const provider:Provider = (process.env.AI_PROVIDER as Provider) || 'openai'
  const { text, tokens } = await callProvider(provider, rendered)

  const outSafety = safetyCheck(text); const status:'done'|'failed' = outSafety.ok ? 'done' : 'failed'
  let parsed:any = text
  if(usedSchema) { 
    try { 
      parsed = JSON.parse(text); OutputSchema.parse(parsed) 
    } catch{ 
      parsed = { text } 
    } 
  }

  await Generation.updateOne(
    { 
      _id: gen._id 
    }, 
    { 
      $set:{ output: parsed, status, safety: outSafety, cost:{ tokens } }, $push:{ events:{ type:'completed', at:new Date(), meta:{ tokens } } } 
    }
  )
  await addUsage(orgId, { tokens }); 
  await trackEvent({ orgId, userId, module, type: 'generation.completed', meta: { generationId: gen._id, tokens } })
  return { 
    ok:true, 
    generationId: 
    gen._id.toString(), 
    output: parsed, 
    cost:{ tokens }, 
    safety: outSafety }
}
