# GrowthPilot User Guide

A hands-on walkthrough of every module and agent, using a single fictional company — **TidyDesk** — as a running example throughout. Follow in order or jump to any section.

---

## The Example Company: TidyDesk

> **TidyDesk** is a B2B SaaS tool that helps remote engineering teams manage tasks, standups, and sprint planning in one place. They charge $29/seat/month, target startups with 10–100 engineers, and are trying to grow from 200 to 1,000 paying teams in the next 12 months.

We'll use TidyDesk in every module to show realistic inputs and what to expect back.

---

## Before You Start: Set Your Brand Voice

**Go to:** Sidebar → **Brand Voice**

Brand Voice is the foundation. Fill it in once and every module will automatically follow your tone, avoid banned phrases, and stay on-message.

### TidyDesk example

| Field | Value |
|---|---|
| Company | TidyDesk |
| Product description | Project management tool for remote engineering teams. Sprint planning, daily standups, and task tracking in one place. $29/seat/month. |
| Target audience | CTOs, engineering managers, and team leads at Series A–B startups with 10–100 engineers |
| Tone of voice | Professional |
| Writing style | Short sentences. Active voice. Lead with the outcome. No buzzwords like "synergy" or "leverage". |
| Brand keywords | async-first, no meetings required, ship faster |
| Banned words | game-changing, revolutionary, disruptive, world-class |
| Content goals | Lead generation, SEO, Brand awareness |
| Competitors | Jira, Linear, Asana |

**Save** and move on. Every generation from now on will embed this context automatically.

---

## Module 1 — PostPilot

**What it does:** Generates platform-native social media posts — correct character limits, hashtags, and tone for each network.

**Go to:** Sidebar → PostPilot

### TidyDesk example

**Step 1 — Write a brief**
```
We just shipped async standup check-ins. Instead of a daily 15-minute 
meeting, engineers answer three questions asynchronously — what they 
did, what's next, blockers. TidyDesk compiles it and sends a summary 
to the whole team. No one has to join a call.
```

**Step 2 — Choose platforms**
Select: LinkedIn, X, Instagram

**Step 3 — Set tone (in Advanced)**
Professional · English

**Step 4 — Generate**

**What you'll get back:**

*LinkedIn (up to 3,000 chars):*
```
We calculated how many hours engineering teams lose to daily standups.

The average team of 10 spends 1.25 hours/week just on the standup 
call itself — not the actual work, just the update.

We built async standups into TidyDesk. Answer 3 questions in 2 
minutes. TidyDesk compiles the responses and sends a summary to 
everyone — no calendar invite required.

The teams using it report fewer context-switch interruptions and 
more focused morning blocks.

If your standup exists to share information (not to make decisions), 
it can be async.

→ Try TidyDesk free: [link]

#remotework #engineeringteams #productivity #asyncwork #saas
```

*X (280 chars):*
```
Your daily standup costs ~1.25 hrs/week per 10 engineers.

TidyDesk async standups: 3 questions, 2 minutes, no call.

Summary delivered to everyone automatically.

Ship the meeting. Ship the feature instead.
```

**Tips:**
- Use the **"Publish to LinkedIn/X"** button if you have social accounts connected under Settings → Social
- Click **"More ↓"** on any card to see visual ideas and alt text for images
- Use the **Iteration Agent** (pencil icon at the bottom of each card) to refine tone or rewrite for a specific angle

---

## Module 2 — BlogPilot

**What it does:** Generates long-form SEO blog posts — keyword-targeted, with outline, full draft, meta tags, FAQ, and schema markup.

**Go to:** Sidebar → BlogPilot

### TidyDesk example

**Keyword:** `async standup tools for remote teams`

**Optional settings:**
- Tone: Professional
- Word count: 1,800
- Reference URL: leave blank

**Click Generate**

**What you'll get back:**

- **Outline** — 8–10 H2/H3 headings (e.g. "Why Traditional Standups Fail Remote Teams", "What Makes a Good Async Standup Tool", "TidyDesk vs. Slack Polls vs. Geekbot")
- **Full draft** — ~1,800 words of Markdown with headings, bullets, short paragraphs
- **Meta** — SEO title + description (≤160 chars)
- **FAQ** — 6 Q&As ready for Google's FAQ schema
- **Alt text** — 6 image suggestions
- **Readability score** — Flesch-Kincaid grade (aim for 8th–10th)

**After you generate:**

1. Click **"Save draft"** to store it
2. Go to **BlogPilot → Library** to find all saved drafts
3. Edit inline if needed
4. Click **"Publish"** to mark it live in your GrowthPilot content library
5. Copy the Markdown and paste into your CMS (Webflow, WordPress, Ghost, Notion)

**Tips:**
- Add internal links in the "Target links" field before generating — the AI will embed them naturally in the draft
- Use the **Research Agent** before generating to find the best keyword angle first (see Agents section below)

---

## Module 3 — AdPilot

**What it does:** Generates ad copy variants for Meta (Facebook/Instagram), Google Search, TikTok, and LinkedIn — with hooks, headlines, body copy, and CTA.

**Go to:** Sidebar → AdPilot

### TidyDesk example

**Fill in the form:**
- Product/Service: TidyDesk — async standup and sprint management for remote engineering teams
- Target audience: Engineering managers at remote-first startups
- Offer/Angle: Free 14-day trial, no credit card
- Platforms: Meta, Google, LinkedIn

**Click Generate**

**What you'll get back (per platform):**

*Meta (3 variants):*
```
Hook: Your engineers are losing 75 hours/year to standup calls.

Headline: Run standups without the call.
Body: TidyDesk's async standups take 2 minutes, not 15. Your team 
answers three questions. You get a clean summary. No scheduling 
required.
CTA: Start free trial
```

*Google Search (3 headline/description sets):*
```
Headline 1: Async Standups for Dev Teams
Headline 2: No More Daily Standup Calls
Headline 3: Try TidyDesk Free for 14 Days
Description: Replace your daily standup call with a 2-minute async 
check-in. TidyDesk compiles responses and sends a summary. Start free.
```

**Tips:**
- Run A/B variants — generate 2–3 sets and pick the strongest hook
- The "Test plan" section in output tells you which elements to split-test first
- Copy directly into Meta Ads Manager, Google Ads, or LinkedIn Campaign Manager

---

## Module 4 — LeadPilot

**What it does:** Embeds an AI chatbot on your website that qualifies visitors, answers questions, and captures contact information — all routed to your dashboard.

**Go to:** Sidebar → LeadPilot

### TidyDesk example — 3 steps

**Step 1 — Choose a playbook**

TidyDesk's main use case: converting pricing page visitors.
→ Select **"Pricing page"** playbook

**Step 2 — Copy the embed code**

```html
<script 
  src="https://your-app.com/api/leadpilot/widget.js" 
  data-playbook="pricing"
></script>
```

Paste this into the `<body>` of your pricing page. The chat bubble appears bottom-right.

**Step 3 — What a visitor sees**

```
Bot: Hi from TidyDesk! I can help pick the right plan and answer 
     pricing questions. What brings you here today?

Visitor: How much does it cost for a team of 15?

Bot: For 15 seats, TidyDesk would be $435/month (billed monthly) 
     or $370/month on annual billing — that's a 15% saving.

     The Pro plan includes async standups, sprint boards, and 
     integrations with GitHub and Slack.

     Quick question: are you currently using a different tool, 
     or starting fresh? Also, can I grab your name, email, and 
     company so our team can follow up?

Visitor: We're switching from Jira. I'm Tom, tom@acmecorp.com.

Bot: Perfect — Jira migrations are something we do regularly 
     and there's even a migration guide available. I'll have 
     someone from the team reach out to you, Tom.

     Want to book a 20-minute demo now? [Book here →]
```

**Step 4 — See leads in your dashboard**

Go to LeadPilot → Your leads. Tom's contact now appears with:
- Name, email, company
- Which playbook they used
- The full conversation transcript

Export as CSV to import into HubSpot, Salesforce, or any CRM.

**Tips:**
- Set `BOOKING_URL` in your env file to a real Calendly/Cal.com link so the bot can send visitors to book immediately
- The bot fetches your site's content automatically — it will answer questions about TidyDesk specifically, not generic GrowthPilot responses
- Use the **Demo request** playbook on your homepage CTA button for visitors who are already warm

---

## Module 5 — MailPilot

**What it does:** Generates multi-step email sequences — cold outreach, nurture campaigns, newsletters, or onboarding flows — ready to copy into any ESP.

**Go to:** Sidebar → MailPilot

### TidyDesk example

**Fill in the form:**
- Sequence type: Cold outreach
- Product/Service: TidyDesk
- Target audience: Engineering managers at remote startups
- Offer: Book a 20-minute demo
- Steps: 4 emails

**Click Generate**

**What you'll get back:**

```
Email 1 — Day 0
Subject: Your daily standup is costing you 75 hours/year
Preview: A quick calculation for remote engineering teams

Hi [First Name],

Quick math: a 15-minute daily standup × 10 engineers × 250 
working days = 625 person-hours per year. Most of that is 
information sharing, not decision making.

TidyDesk replaced our customers' standups with a 2-minute 
async check-in. Same information, no call.

Worth a 20-minute look?

[Book a demo] → [link]

— [Your name], TidyDesk

---

Email 2 — Day 3
Subject: How Acme cut standup time by 80%
...

Email 3 — Day 7
Subject: One question before I close this
...

Email 4 — Day 12 (breakup email)
Subject: Closing the loop
...
```

Each email also includes:
- Spam score (lower is better — aim for < 3)
- Subject line alternatives
- Merge tag suggestions (`[First Name]`, `[Company]`)

**Export options:**
- **Copy** — paste into any ESP (Mailchimp, Brevo, Loops)
- **Export as EML** — download as email files
- **Push to Klaviyo** — if `KLAVIYO_API_KEY` is set, send the sequence directly to a list or segment

---

## Agents

Agents are different from modules. Instead of you filling in fields and clicking generate, **you describe a goal and the agent decides what to do and runs the tools itself**.

---

### Agent 1 — Campaign Agent

**What it does:** Takes a single brief, plans which content to create (blog + social + ads + email + chatbot), and runs all the tools in sequence. Full campaign in one shot.

**Go to:** Sidebar → Campaign Agent

### TidyDesk example

**Brief:**
```
TidyDesk is launching a new integration with GitHub. When a PR 
is merged, it automatically closes the linked TidyDesk task and 
updates the sprint board. We want to reach engineering managers 
at remote-first startups and drive signups for our free trial. 
Target: developers who are frustrated with manual task updates.
```

**Company:** TidyDesk  
**Audience:** Engineering managers, remote-first startups

**Click "Run Campaign Agent"**

The agent will:
1. Plan which tools to run (you'll see this as it executes)
2. Generate a **blog post** — "How TidyDesk + GitHub Eliminates Manual Task Updates"
3. Generate **social posts** — LinkedIn announcement, X thread, Instagram visual idea
4. Generate **ad copy** — Meta and Google ads targeting developer pain points
5. Generate an **email sequence** — 3-email drip for signups who haven't activated GitHub
6. Configure a **lead chatbot** — FAQ about the GitHub integration

Each section is collapsible. Click to expand and read the full output.

**This is the fastest way to launch a campaign.** Use it when you have a new feature, event, or announcement and need everything at once.

---

### Agent 2 — Iteration Agent

**What it does:** Takes any piece of content you've already generated and refines it based on plain-language feedback.

**Go to:** Sidebar → Iteration Agent  
(or click the pencil icon at the bottom of any generated content card)

### TidyDesk example

You generated a LinkedIn post with Campaign Agent but the tone feels too salesy. You want it more educational.

**Paste the content:**
```
Stop losing 75 hours/year to standup calls. TidyDesk async 
standups take 2 minutes. No meetings, no scheduling, no wasted 
time. Start your free trial today.
```

**Write your feedback:**
```
Less promotional. Rewrite it to feel like a thought piece — 
something an engineering manager would share because it's 
insightful, not because it's an ad. Lead with the problem, 
not the product.
```

**What you'll get back:**
```
Remote engineering teams aren't struggling because they lack 
discipline. They're struggling because synchronous information 
sharing scales poorly.

A 10-person team spending 15 minutes on a daily standup loses 
625 person-hours per year — to status updates that could be 
written in 2 minutes.

The standup itself isn't the problem. The requirement to be 
present at the same time is.

Async check-ins solve this: same information, no calendar 
dependency. Teams that switch report fewer interruptions and 
more focused mornings.

If your standup exists to share updates (not make decisions), 
it can be async.
```

**Version history is saved** — every iteration is stored so you can go back.

---

### Agent 3 — Research Agent

**What it does:** Researches a topic or keyword before you generate content — finds search intent, content gaps, and the strongest angle for your brief.

**Go to:** Sidebar → Research Agent

### TidyDesk example — use before BlogPilot

**Input:**
- Keyword: `remote standup tools`
- Your product: TidyDesk — async project management for remote teams

**What you'll get back:**
```
Top-ranking intent: Comparison ("best async standup tools 2025")
Content gap: No article addresses engineering teams specifically — 
             most target general remote workers
Strongest angle: "Async Standup Tools for Engineering Teams: 
                 Ranked by Developer Experience"
Suggested structure:
  1. Why generic standup tools fail dev teams
  2. What engineers actually need (GitHub integration, PR tracking)
  3. Tool comparison table (TidyDesk, Geekbot, Status Hero, Slack bots)
  4. How to run your first async standup
```

**Click "Use in BlogPilot"** — the keyword and suggested angle are pre-filled in BlogPilot automatically.

---

## AutoPilot — Scheduled Campaigns

**What it does:** Runs the Campaign Agent on a schedule (daily, weekly, bi-weekly, or monthly) without you doing anything. Each run generates a full content set for the brief you defined.

**Go to:** Sidebar → Autopilot

### TidyDesk example

**Create an Autopilot:**
- Name: `Weekly engineering productivity content`
- Brief:
  ```
  Each week, create content about async work, remote engineering 
  culture, and developer productivity. Tie it back to TidyDesk 
  where natural. The goal is to build an audience of engineering 
  managers who will eventually try TidyDesk.
  ```
- Company: TidyDesk
- Audience: Engineering managers, CTOs, remote-first startups
- Cadence: **Weekly**
- Run time: **09:00 UTC Monday**

**Save.** Every Monday at 9am UTC, GrowthPilot will:
1. Generate a blog post on a productivity angle
2. Generate social posts for LinkedIn, X, Instagram
3. Generate supporting ad copy
4. Generate an email for your newsletter
5. Save everything to your dashboard

**To see results:**
- After the first run, an **"View last campaign results →"** link appears on the Autopilot card
- Click it to see the full output from the last run
- Edit the brief anytime by clicking **Edit** on the card

> **Note:** AutoPilot requires the background worker to be running.  
> Start it with: `npm run worker:autopilot`  
> On Vercel, deploy the worker separately on Railway or Render.

---

## Putting It All Together — TidyDesk's Weekly Workflow

Here's how a real marketing team would use GrowthPilot in a week:

| Day | Action | Module/Agent |
|---|---|---|
| Monday | AutoPilot runs automatically | Autopilot |
| Monday | Review the week's content output | Dashboard → History |
| Tuesday | Publish blog post to CMS | BlogPilot → Library → Copy Markdown |
| Tuesday | Post LinkedIn article | PostPilot → Publish (if connected) |
| Wednesday | Launch paid ads for the week's angle | AdPilot → Copy to Meta/Google |
| Thursday | Send email to list | MailPilot → Export → ESP |
| Friday | Review leads captured this week | LeadPilot → Your leads |
| Friday | New feature dropping next week? | Campaign Agent — generate everything at once |
| Ongoing | LeadPilot chatbot running on website | Automatic — no action needed |

---

## Quick Reference

| You want to… | Use… |
|---|---|
| Post on LinkedIn/X/Instagram | PostPilot |
| Write an SEO blog post | BlogPilot |
| Create paid ad copy | AdPilot |
| Capture leads from your website | LeadPilot |
| Write a cold outreach or nurture sequence | MailPilot |
| Generate a full campaign from one brief | Campaign Agent |
| Refine content with feedback | Iteration Agent |
| Find the best keyword angle before writing | Research Agent |
| Schedule recurring content automatically | AutoPilot |
| Make all AI output follow your brand | Brand Voice |

---

## Common Mistakes to Avoid

**1. Skipping Brand Voice**  
Without it, every generation starts fresh. With it, the AI knows your tone, avoids your banned words, and targets your audience automatically. Set it once before doing anything else.

**2. Using Campaign Agent for everything**  
Campaign Agent is powerful but broad. If you need one very specific piece of content (a single LinkedIn post, a single email), use the individual module — you'll get more control over the output.

**3. Publishing the first draft**  
GrowthPilot generates a strong first draft. Always read it. Use the Iteration Agent to fix tone, add specifics, or adjust the angle. One round of iteration typically makes the content noticeably better.

**4. Not connecting social accounts**  
You can generate content without connecting accounts, but then you have to copy-paste manually. Connect LinkedIn and X under **Settings → Social** and publish directly from PostPilot.

**5. Running AutoPilot without the worker**  
AutoPilot won't execute on Vercel serverless. If you're deploying on Vercel, run the worker on Railway, Render, or a VPS. Check `npm run worker:autopilot`.
