import OpenAI from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { AGENT_TOOLS, TOOL_LABELS } from './tools'
import {
  runBlogGenerator,
  runSocialGenerator,
  runAdGenerator,
  runEmailGenerator,
  runLeadChatbotGenerator,
} from './generators'

const SYSTEM_PROMPT = `You are GrowthPilot's campaign agent. You help marketing teams launch campaigns fast.

Given a brief, you:
1. Decide which content to create — not everything is needed for every campaign
2. Call the right tools in a smart order (blog first for SEO context, then social + ads in parallel if both needed, then email, then chatbot)
3. After all tools complete, write a short plain-language summary of what was created and what to do next

Rules:
- Blog: use for thought leadership, SEO, long-form content
- Social posts: use for social media presence and engagement
- Ads: use only when paid campaigns are explicitly needed
- Email: use for launches, nurture sequences, or outreach
- Lead chatbot: use when lead capture or demo booking is a goal
- Keep it focused: 2–3 tools for quick campaigns, all 5 for comprehensive product launches
- Never hallucinate tool names — only call the tools listed
- After tools complete, end with a concise 2–4 sentence summary`

export type StepUpdate = {
  tool: string
  label: string
  status: 'running' | 'done' | 'failed'
  input: Record<string, any>
  output?: any
  error?: string
  startedAt: Date
  completedAt?: Date
}

export type AgentResult = {
  steps: StepUpdate[]
  summary: string
}

export async function runAgentLoop(
  brief: string,
  {
    company,
    audience,
    onStep,
  }: {
    company?: string
    audience?: string
    onStep?: (update: StepUpdate) => Promise<void>
  } = {}
): Promise<AgentResult> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const userMessage = [
    `Campaign Brief: ${brief}`,
    company  ? `Company / Product: ${company}`   : '',
    audience ? `Target Audience: ${audience}` : '',
  ].filter(Boolean).join('\n')

  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user',   content: userMessage },
  ]

  const steps: StepUpdate[] = []
  const MAX_TURNS = 12

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const response = await openai.chat.completions.create({
      model: process.env.AGENT_MODEL || 'gpt-4o',
      messages,
      tools: AGENT_TOOLS,
      tool_choice: 'auto',
    })

    const choice = response.choices[0]
    messages.push(choice.message as ChatCompletionMessageParam)

    // Agent decided it's done
    if (choice.finish_reason === 'stop') {
      return {
        steps,
        summary: choice.message.content?.trim() || 'Campaign content generated successfully.',
      }
    }

    // Agent wants to call tools
    if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls) {
      for (const toolCall of choice.message.tool_calls) {
        const fn = (toolCall as any).function as { name: string; arguments: string }
        const name = fn.name
        const input = JSON.parse(fn.arguments)
        const label = TOOL_LABELS[name] || name
        const startedAt = new Date()

        const runningStep: StepUpdate = { tool: name, label, status: 'running', input, startedAt }
        await onStep?.(runningStep)

        let output: any
        let error: string | undefined

        try {
          output = await executeAgentTool(name, input, { company, audience })
          const doneStep: StepUpdate = { tool: name, label, status: 'done', input, output, startedAt, completedAt: new Date() }
          steps.push(doneStep)
          await onStep?.(doneStep)
          messages.push({ role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify(output) })
        } catch (e: any) {
          error = e?.message || 'Tool execution failed'
          const failedStep: StepUpdate = { tool: name, label, status: 'failed', input, error, startedAt, completedAt: new Date() }
          steps.push(failedStep)
          await onStep?.(failedStep)
          messages.push({ role: 'tool', tool_call_id: toolCall.id, content: `Error: ${error}` })
        }
      }
    }
  }

  return { steps, summary: 'Campaign generation complete.' }
}

async function executeAgentTool(
  name: string,
  args: any,
  ctx: { company?: string; audience?: string }
): Promise<any> {
  switch (name) {
    case 'generate_blog':
      return runBlogGenerator(args)

    case 'generate_social_posts':
      return runSocialGenerator({ ...args, company: ctx.company, audience: ctx.audience })

    case 'generate_ads':
      return runAdGenerator(args)

    case 'generate_email':
      return runEmailGenerator({ ...args, audience: ctx.audience })

    case 'configure_lead_chatbot':
      return runLeadChatbotGenerator(args)

    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}
