import type { ChatCompletionTool } from 'openai/resources/chat/completions'

export const AGENT_TOOLS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'generate_blog',
      description:
        'Write an SEO blog post draft. Use when the brief needs thought leadership, organic search traffic, or long-form content.',
      parameters: {
        type: 'object',
        properties: {
          topic:    { type: 'string', description: 'Main topic or working headline for the blog post' },
          keywords: { type: 'array', items: { type: 'string' }, description: 'Target SEO keywords (3–6)' },
          tone:     { type: 'string', description: 'Writing tone: neutral, friendly, professional, authoritative' },
        },
        required: ['topic', 'keywords'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_social_posts',
      description:
        'Generate platform-native social media posts. Use to build social presence and drive engagement.',
      parameters: {
        type: 'object',
        properties: {
          brief: { type: 'string', description: 'What to write about — can be a product, event, idea, or hook' },
          platforms: {
            type: 'array',
            items: { type: 'string', enum: ['instagram', 'linkedin', 'x', 'facebook', 'tiktok'] },
            description: 'Which platforms to generate posts for',
          },
          count: { type: 'number', description: 'Variants per platform (1–3, default 1)' },
        },
        required: ['brief', 'platforms'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_ads',
      description:
        'Generate ad copy variants for paid campaigns. Use when the brief mentions paid media, acquisition, or promotion.',
      parameters: {
        type: 'object',
        properties: {
          offer: { type: 'string', description: 'What is being advertised or the core value proposition' },
          platforms: {
            type: 'array',
            items: { type: 'string', enum: ['meta', 'google', 'tiktok'] },
            description: 'Ad platforms to create copy for',
          },
          angle: {
            type: 'string',
            description: 'Creative angle: pain_point, benefit, social_proof, urgency, curiosity',
          },
        },
        required: ['offer', 'platforms'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_email',
      description:
        'Write an email or email sequence. Use for launches, welcome flows, newsletters, or cold outreach.',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['cold', 'warm', 'newsletter', 'nurture'],
            description: 'Type of email campaign',
          },
          offer:    { type: 'string', description: 'What the email is promoting or what action it drives' },
          steps:    { type: 'number', description: 'Number of emails in the sequence (1–5, default 3)' },
          audience: { type: 'string', description: 'Who the email is for' },
        },
        required: ['type', 'offer'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'configure_lead_chatbot',
      description:
        'Generate a lead capture chatbot configuration. Use when the goal is capturing leads, qualifying visitors, or booking demos.',
      parameters: {
        type: 'object',
        properties: {
          product: { type: 'string', description: 'What product or service the chatbot represents' },
          goal:    { type: 'string', description: 'Conversion goal: collect_email, book_demo, qualify_lead, get_phone' },
        },
        required: ['product', 'goal'],
      },
    },
  },
]

export const TOOL_LABELS: Record<string, string> = {
  generate_blog:           'Writing SEO blog post',
  generate_social_posts:   'Creating social posts',
  generate_ads:            'Generating ad copy',
  generate_email:          'Writing email sequence',
  configure_lead_chatbot:  'Configuring lead chatbot',
}
