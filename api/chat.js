const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Models ────────────────────────────────────────────────────────────────
const ORCHESTRATOR_MODEL = 'claude-haiku-4-5';   // fast + cheap for routing
const AGENT_MODEL        = 'claude-sonnet-4-5';  // quality for answers

// ── Rules injected into every agent ──────────────────────────────────────
const SHARED_RULES = `You are Welli, Wellhub's onboarding assistant for HR admins.
Be direct and conversational — like a knowledgeable colleague, not a manual.
Give concise answers.
FORMAT RULES (strictly enforced):
- Never use asterisks or markdown bold (**text**). Never use headers like "Exact steps:" or "Why it matters:".
- For step-by-step instructions, use a numbered list: "1. Do this  2. Do that"
- For quick tips or options, use a bullet list: "- item"
- For a single highlighted action, start the line with → (e.g. "→ Go to Employees > Update employees")
- Use plain prose for everything else. Short paragraphs, one idea per line.
- No preamble ("Great question!", "Of course!", "Thanks for asking!").
Copy portal navigation paths VERBATIM from the knowledge section — never paraphrase or shorten them.
Do not end your reply with a question.
If asked about payroll deductions or third-party integrations: say "That's handled directly by your CS rep — reach out to them."
Only refer to contacting CS for: billing disputes, cancellation requests, legal questions, serious platform errors.
Never invent portal paths, features, or statistics not present in the knowledge section.
GP STEP SIGNAL: If your answer fully explains how to complete one specific Golden Path step, append <<<GP:STEP_ID>>> at the very end of your response (nothing after it). Valid IDs: upload, invites, teaser, leadership, i2s, webinar, comms. Only append if the answer IS the complete how-to for that exact step — not for general questions.`;

// ── Knowledge bases ───────────────────────────────────────────────────────
const KB = {

  PRODUCT_FAQ: `
Wellhub (formerly Gympass) is a corporate wellbeing benefit that gives employees access to gyms, fitness studios, wellness apps, and 1:1 expert sessions through a single employer-sponsored subscription. Companies contract with Wellhub and pay a monthly prepaid fee; their employees then activate a personal plan and use it freely.

EMPLOYEE STATES: Eligible = on the uploaded list with access rights. Member = created a Wellhub account, no active plan. Subscriber = on an active plan (including free trial, paused, or limited access). Family Member = dependent enrolled via the Family Members add-on.

PLANS: Employees choose from Basic, Silver, Gold, or Platinum. Each tier unlocks additional 1:1 services: Silver adds physiotherapy sessions, Gold adds nutrition sessions, Platinum adds a financial coach. A free Digital Plan provides wellness app access without gym network. Plans cost up to 60% less than retail gym prices.

ADD-ONS (company level): Family Members (employees add up to 3 dependents), Global Digital Plan (digital-only for regions without in-person partners), Wellhub+ (company subsidizes part or all of employee plan costs — enabling this restricts employee additions to spreadsheet-import only).

EMPLOYEE EXPERIENCE: Employees download the Wellhub app, sign up with their work email, choose a plan, and check in to partner facilities or apps to log usage. A check-in is a verified visit. Active User = 5+ check-ins per month. Employees can pause a subscription once every 6 months for 15–30 consecutive days.

ROI BENCHMARKS: 90% of HR leaders measuring wellness ROI see a positive return. 89% report fewer sick days. 47% lower absenteeism for active users. Up to 35% reduction in healthcare costs. Average client ROI = 127%. 52% of clients report a significant productivity increase. Turnover is 30% lower among actively engaged Wellhub employees. 93% of workers prioritize wellbeing as much as salary.

TRAINIAC: Wellhub's personal training service — assigned certified coach, 100% personalized plans, daily follow-up, video library, progress tracking. Available from Silver tier.
WELLHUB AI: AI-powered conversational wellness assistant in the employee app (beta).
CHALLENGES: Free feature for all clients. Employees earn points via steps, gym check-ins, and class bookings. Non-subscribers can join step challenges by downloading the free app.
`,

  PLATFORM_SUPPORT: `
PORTAL LOGIN: clients.gympass.com — use email + password from the invitation email "You've been invited to Wellhub for Companies." If missing, check spam. For login issues, try incognito or clear browser cache. Multi-entity admins must select the correct company from the upper-left dropdown before any action — selecting "All companies" applies changes across every entity under the same Tax ID. The Company ID is the alphanumeric string in the portal URL after the slash; needed when contacting support along with Tax ID and company name.

ADMIN ROLES — Add: Settings > Roles and permissions > Manage staff users > Add user (top right) > enter name, email, select role > Send. Remove/Edit: click the arrow next to the user's name > Edit access or Remove access. Keep more than one Admin to prevent lockout. Roles: Admin (full access, can manage other users), Finance (invoices and credit cards), Operations (view/manage employees and accept payroll terms), Analytics (dashboard and reports), Communications (promotional materials only).

ADD EMPLOYEES IN BULK: Employees > Update employees > Import from a spreadsheet > Add employees > download template > fill name/email/NIN > upload > Confirm and import.
ADD ONE AT A TIME: Employees > Update employees > Add one at a time (not available for Wellhub+ customers).
REMOVE IN BULK: Employees > Update employees > Import from a spreadsheet > Remove employees (removing 5+ triggers extra confirmation; removing 10%+ of list via Replace is blocked).
REMOVE INDIVIDUALLY: Employees > select employee > Remove > confirm.
REPLACE ENTIRE LIST: Employees > Update employees > Import from a spreadsheet > Replace your current list > acknowledge warning > upload complete file > confirm. This is irreversible.
UPLOAD STATUS / ERRORS: Employees > Upload history > click the arrow next to any upload. Security checks: Low (review and confirm), Moderate (type a phrase), High (paused for Wellhub manual review).
RESTORE REMOVED EMPLOYEE: Re-add with same eligibility key within 30 days → subscription automatically restored. After 30 days, plan persists but at a different pricing tier.

AUTOMATIC INVITATIONS: Settings > Communication > Invite your employees. Options: Smart Invites (recommended — auto-invites new eligibles and re-invites non-subscribers every 60 days), Basic Invites (one email when first added), or Off. To add a sender name: click Add sender on the same page — applies to all future invitations.
KICK-OFF EMAIL (one-time blast to all eligibles): Settings > Communication > Invite your employees > Kick Off Invites > select date (up to 30 days ahead) > confirm. Can also be set at the final Review step of an employee upload — must select date before clicking Import, or invites send immediately.
MANUAL INVITATIONS: Employees > select employee(s) > click the arrow > "Send invitation" or "Resend invitation." If employee shows "Missing email," update their profile first.
MAGIC LINK & QR CODE: Available on the portal homepage under "Make signup a snap," or Settings > Communication > Invite your employees > Magic link. Copy the link or download the QR code image from there.
PREVIEW INVITE: Click "Preview invite" on the invitation settings page to see what the email looks like before sending.

SUPPORT: clients.gympass.com | support.wellhub.com | Live chat Mon–Fri 9:00–18:00 ET; after-hours requests responded to within 1 business day.
`,

  LAUNCH_READINESS: `
THE GOLDEN PATH (5 mandatory steps — must not be removed or reordered):
Step 1 — TEASER (1–2 weeks before launch): Post early awareness on internal channels — email, Slack, intranet, posters, digital screens. Goal: employees see Wellhub before the invitation arrives.
Step 2 — LEADERSHIP ANNOUNCEMENT (launch day or day before): A message from a leader using Wellhub-supplied copy confirming the benefit is real and supported. This builds trust and is the single highest-impact action.
Step 3 — I2S — INVITATION TO SIGN UP (launch day): The Kick-off email sends automatically from the portal with a Magic Link. Employees click and sign up in minutes.
Step 4 — WELCOME WEBINAR (~1 week after launch): Free 30-min live session hosted by Wellhub. HR picks a date, shares the link. Wellhub runs it. Covers the product and answers employee questions. Can be hosted on the client's platform or via Wellhub Zoom.
Step 5 — COMMUNICATION ASSETS (Month 2 onward): Wellhub sends monthly ready-made emails automatically. HR forwards them. Also: share flyers, videos, digital assets from the portal.

ENGAGEMENT IMPACT DATA (use these exact figures): With Wellhub+, engaged clients reach 27.4% enrollment at Month 1, 35.1% at Month 3, 41.3% at Month 6 — vs. 5.4%, 7.5%, 10.2% for non-engaged. Without Wellhub+, engaged clients reach 9.7% at Month 1, 13.2% at Month 3, 21.7% at Month 6 — vs. 1.1%, 1.0%, 1.4% for non-engaged.

INTERNAL ANNOUNCEMENT TEMPLATE:
Subject: A new wellness benefit just for you
Body: Hi [team name], [Company] is excited to offer Wellhub — access to 40,000+ gyms, studios, and wellness apps. Sign up at [Magic Link]. Questions? Contact HR.

I2S SETUP STEPS: Upload eligibility file (Employees > Update employees > Import from a spreadsheet > Add employees) > expand Smart Invites section > click "View Invite Settings" > select send date up to 30 days ahead (or use Wellhub's recommended window) > scroll to acknowledgement > click Import > click "Kick Off Invites." The date MUST be selected before clicking Import — skipping it sends invitations immediately. After upload, share Wellhub's email safelisting document (IPs and domains) with the client's IT team to prevent delivery failures.

WELLHUB+ SETUP: Go to Settings to configure the company subsidy. Wellhub+ means the company covers part or all of employee plan costs — this is the single biggest driver of enrollment. Enabling Wellhub+ restricts employee additions to spreadsheet-import only.

FORMAL ONBOARDING MILESTONES (EU T1/T2): M0 = internal alignment (3 days post-Opp Won). M1 = Strategy Meeting (led by CS). M2 = Communication Strategy session (D-30 before launch, led by WE team — client must sign off the Core Strategy Launch Plan). W4C Training = eligibility file upload training (5–10 days before launch). Post-launch checkpoints: FV Track at D7, Health Checkpoint D15, Growth Checkpoint D30 and D60.
`,

  ENROLLMENT_SPRINT: `
ENROLLMENT BENCHMARKS: Engaged clients with Wellhub+ hit 27.4% enrollment at Month 1, 35.1% at Month 3, 41.3% at Month 6. Without Wellhub+: 9.7% at Month 1, 21.7% at Month 6. Non-engaged clients average 1–5% across the same periods. Top-quartile clients hit 27%+ by Month 1.

CHECK ENROLLMENT: Dashboard & Reports section of the admin portal (requires Analytics role). The homepage shows at-a-glance counts of eligible employees, members, subscribers, and check-ins. Full reports include: Engagement Report (daily eligibles, members, subscribers, family members), Check-in Details (per check-in by employee), Subscribers Report (plan status: Active, Paused, Cancelled, Limited Access), Subscription History (full log of changes).

POST-LAUNCH CHECKPOINTS: D7 (FV Track — confirm First Value achieved), D15 (Health Checkpoint), D30 (Growth Checkpoint), D60 (Growth Checkpoint). Clients not yet at First Value are a priority for intervention.

RE-INVITE NON-SUBSCRIBERS: Smart Invites automatically re-invites eligible non-subscribers every 60 days — no manual action needed. For manual re-invitations: Employees > select employees with uninvited or pending status > click the arrow > "Resend invitation." Employees with "Missing email" status cannot be invited until a valid address is added.

CHALLENGES (most powerful early-sprint tool): SMBs running a Wellhub Challenge within the first 30 days see an average 35% enrollment increase (Wellhub internal study, 2024). Non-subscribers can participate in step challenges by downloading the free Wellhub app — no plan required, which removes the barrier to entry.
CREATE A CHALLENGE: Challenges > Create a challenge > choose preset or custom title > set duration (up to 30 days) and start date > select level > Publish challenge. Once live: real-time participation rate, points, days remaining, and leaderboard visible on the Challenge page. Pre-built promotional assets (social posts, email templates, infographics, FAQs): Challenges > View materials. Challenges can only be cancelled before they start — in-progress challenges cannot be cancelled.

LOW ENROLLMENT PLAYBOOK:
1. Re-invite non-subscribers manually (Employees > select > Resend invitation)
2. Run a Challenge immediately (average +35% enrollment lift)
3. Ask HR to share assets on internal channels (flyers, digital posts, videos from portal)
4. Schedule the Welcome Webinar if it hasn't happened yet
5. Request a leadership re-announcement

KEY SUCCESS FACTORS (from WE Knowledge Center case studies): Institutional and leadership engagement is the single strongest driver. Multi-workstream coordination outperforms isolated tactics. High communication frequency materially impacts membership rate. For non-desk audiences: WhatsApp, printed materials, in-person events. Local champions outperform central communications.
`,

  ENGAGEMENT_RETENTION: `
EEP (EMPLOYEE ENGAGEMENT PLAN): A co-created annual wellbeing plan between Wellhub's WE (Wellbeing Engagement) team and the client, presented using the Scalable Menu slide pack. Four content blocks:
Block 1 — Awareness: update intranet, benefits page, monthly newsletters with current Wellhub service info.
Block 2 — 1:1 Tools Awareness: promote personalized sessions (psychologists, physiotherapists, nutritionists, personal trainers via Trainiac, financial coaches) available at different plan tiers.
Block 3 — Cross-Client Events: monthly free seasonal events, raffles, challenges, and webinars from Wellhub's shared calendar.
Block 4 — Quarterly Communication Plan: live seminars, fitness sessions, testimonials, zone-segmented actions, Wellhub challenges, and wellbeing materials.
EEP CADENCE: 1 initiative per quarter, 3–6 months of planning ahead at all times. Weekly SLA: Week 1 gather info + consult WE Planner, Week 2 present to client, Week 3 confirm plan, Week 4+ execute.

SCALABLE MENU CATEGORIES: Events & Webinars (Monthly Wellhub Refresh — 20-min monthly webinar open to all UK+IE eligibles, Tailored Events, Wellbeing Champion Calls, Pre-Recorded Videos, Campaign Events), Printed/Onsite Materials (posters A3/A4, flyers A5, pull-up banners, scratch/business cards with QR codes, payslips), Digital Content (e-screens, banners, GIFs, interactive PDFs, infographics, social posts), Challenges & Motivators (raffles, challenges).

RAFFLES: Best run with at least 3 weeks of promotion across at least 2 channels. Winners selected from new subscribers during the promotional period. Wellhub sponsors the prize — cannot be plan discounts or free trials.

MOMENTUM PROGRAM (free HR resource hub): digital.gympass.com/momentum-program/us/ — includes Employee Engagement Toolkit, New Hire Toolkit, Challenges Toolkit, monthly employee webinars ("Say Hello to Wellhub" + themed sessions), monthly HR insider briefing (30-min Wellhub Monthly Insider covering roadmap and network updates), and the Wellness Pulse newsletter (50,000+ HR members).

D2E (DIRECT TO EMPLOYEE): Wellhub-driven weekly personalized messages sent to all opted-in employees at no extra cost. Companies using the complete D2E experience see significantly higher participation vs. basic flow.

ANNUAL CAMPAIGN CALENDAR (UK/IE): Gympass Moves (Jan–Feb), Spring Fling (Mar–May, includes MHAW webinar), Check-in with your Wellbeing (Jun–Aug), Back to Basics (Sept–Oct, includes WMHD with Ifeel), Winter Wellbeing (Nov–Dec). Registration for cross-client events: promo.wellhub.com/uki/calendar/

FIND YOUR PATH: Interactive quiz that delivers personalized plan recommendations to employees — targets converting free members to paid plans. Available only to clients on an approved list — ask CS.

WELLBEING CHAMPIONS MODEL: Nominated employee advocates equipped via WC Calls with Wellhub knowledge; they become brand ambassadors driving word-of-mouth adoption across the workforce.

KEY LONG-TERM BENCHMARKS: 90% of HR leaders measuring wellness ROI see positive returns. 89% report fewer sick days. 47% lower absenteeism for active users. Average client ROI = 127%. Celebrate milestone enrollment: 10%, 20%, 27%+ — run a raffle or challenge tied to each.
`
};

// ── Agent metadata ────────────────────────────────────────────────────────
const AGENTS = {
  PRODUCT_FAQ: {
    name: 'Product & Plans',
    color: '#A880FF',
    specialty: 'explaining what Wellhub is, how plans work, what employees experience, and the business case for HR.'
  },
  PLATFORM_SUPPORT: {
    name: 'Platform Support',
    color: '#F2496B',
    specialty: 'Wellhub for Companies admin portal: adding/removing employees, managing admins, configuring invitations, Magic Link, and portal navigation.'
  },
  LAUNCH_READINESS: {
    name: 'Launch Readiness',
    color: '#0C8046',
    specialty: 'pre-launch setup: the Golden Path, communication strategy, eligibility file upload, and sending the first invitation (I2S).'
  },
  ENROLLMENT_SPRINT: {
    name: 'Enrollment Sprint',
    color: '#F2496B',
    specialty: 'first 30 days after the invitation: checking enrollment data, re-inviting non-subscribers, running Challenges, and boosting sign-ups.'
  },
  ENGAGEMENT_RETENTION: {
    name: 'Engagement & Retention',
    color: '#1B1340',
    specialty: 'Month 2+ programs: EEP planning, WE team collaboration, Momentum Program, campaigns, raffles, and long-term engagement strategies.'
  }
};

// ── Orchestrator prompt ───────────────────────────────────────────────────
const ORCHESTRATOR_PROMPT = `You route Wellhub HR admin questions to the right support agent. Classify each message into exactly one of these five categories:

PRODUCT_FAQ — What Wellhub is, plan tiers (Basic/Silver/Gold/Platinum), features, employee experience, ROI statistics, cost, Wellhub vs competitors, what is a subscriber/member/eligible
PLATFORM_SUPPORT — Admin portal how-tos: adding or removing employees, managing admin roles and permissions, invitation settings, Magic Link, QR code, portal login or access issues
LAUNCH_READINESS — Pre-launch setup, the Golden Path, communication strategy, eligibility file upload, scheduling the I2S (first invitation email), Welcome Webinar setup, leadership announcement; also "what's my next step" questions where the next pending step is a pre-launch or setup action
ENROLLMENT_SPRINT — First 30 days after I2S: checking enrollment numbers, low enrollment fixes, re-sending invitations, running Challenges, reading dashboard reports; also "what's my next step" questions where the next pending step is post-launch
ENGAGEMENT_RETENTION — Month 2+ long-term engagement: EEP, WE program, Scalable Menu, Momentum Program, annual campaigns, raffles, Wellbeing Champions, D2E; also "what's my next step" questions in Phase 4

Reply with only the category name — nothing else.`;

// ── Request handler ───────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured on this server.' });
  }

  const { message, history = [], phase = 1, goldenPath, company, daysToLaunch } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Missing message' });

  // ── #feedback handler (bypasses orchestrator) ──────────────────────────
  if (message.trim().toLowerCase().startsWith('#feedback')) {
    const feedbackText = message.trim().replace(/^#feedback\s*/i, '') || '(no text provided)';
    const entry = `\n**${new Date().toISOString()}** — Phase ${phase}\n> ${feedbackText}\n`;
    try {
      const fs = require('fs');
      const path = require('path');
      const feedbackFile = path.join(process.cwd(), 'feedback.md');
      fs.appendFileSync(feedbackFile, entry);
    } catch (e) {
      console.log('Feedback (log only):', entry); // fallback for production
    }
    return res.status(200).json({
      response: "Feedback saved. I'll flag this for the KB update.",
      agentKey: 'FEEDBACK',
      agentName: 'Feedback',
      agentColor: '#A880FF'
    });
  }

  try {
    // ── Build client context string ───────────────────────────────────────
    const clientLines = [];
    if (company)                          clientLines.push(`Client company: ${company}.`);
    if (daysToLaunch !== null && daysToLaunch !== undefined) {
      if (daysToLaunch > 1)  clientLines.push(`Days until launch: ${daysToLaunch}.`);
      else if (daysToLaunch === 1) clientLines.push('Launch is tomorrow — urgency is high.');
      else if (daysToLaunch === 0) clientLines.push('Today is launch day!');
      else                         clientLines.push(`Already launched ${Math.abs(daysToLaunch)} day(s) ago.`);
    }
    if (goldenPath) {
      clientLines.push(`Golden Path: ${goldenPath.completed}/${goldenPath.total} steps complete.`);
      if (goldenPath.nextPending) clientLines.push(`Next pending step: "${goldenPath.nextPending}".`);
    }
    const gpCtx = clientLines.length ? '\n\nCLIENT CONTEXT:\n' + clientLines.join(' ') : '';

    // ── Step 1: Classify intent via Orchestrator (Haiku — fast + cheap) ──
    const classification = await anthropic.messages.create({
      model: ORCHESTRATOR_MODEL,
      max_tokens: 20,
      system: ORCHESTRATOR_PROMPT + `\n\nContext: client is in onboarding stage ${phase}/3 (1=Get to Know Wellhub, 2=Get Ready to Launch, 3=Life After Launch).` + gpCtx,
      messages: [{ role: 'user', content: message }]
    });

    const rawKey = classification.content[0].text.trim().toUpperCase();
    const agentKey = AGENTS[rawKey] ? rawKey : 'PLATFORM_SUPPORT';
    const agent = AGENTS[agentKey];

    // ── Step 2: Answer via Specialist Agent (Sonnet — quality) ───────────
    const systemPrompt = [
      SHARED_RULES,
      `\nYour specialty: ${agent.specialty}`,
      gpCtx ? `${gpCtx}\n\nUse the client context above to personalise your answers. When days until launch is low (≤7), flag urgency explicitly. When the client asks "what's my next step", give one concrete action: name it, explain why it matters, and give the exact steps to do it right now.` : '',
      `\nKNOWLEDGE:\n${KB[agentKey]}`
    ].join('\n');

    // Keep last 6 messages (3 turns) to avoid context bloat
    const messages = [
      ...history.slice(-6),
      { role: 'user', content: message }
    ];

    const answer = await anthropic.messages.create({
      model: AGENT_MODEL,
      max_tokens: 600,
      system: systemPrompt,
      messages
    });

    return res.status(200).json({
      response: answer.content[0].text.trim(),
      agentKey,
      agentName: agent.name,
      agentColor: agent.color
    });

  } catch (err) {
    console.error('Welli API error:', err);
    return res.status(500).json({ error: err.message || 'Something went wrong. Please try again.' });
  }
};
