const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Connect+ Help Center search ───────────────────────────────────────────
// Queries api.cx.gympass.com for relevant articles to augment Welli's answers.
// Requires CONNECT_PLUS_TOKEN env var. Falls back to TEST_FIXTURES when the
// token is absent so the integration can be validated before credentials arrive.

const HC_TEST_FIXTURES = [
  {
    title: 'How to upload your employee eligibility list',
    url: 'https://helpcenter.gympass.com/en-us/articles/employee-list-upload',
    excerpt: 'To add employees in bulk: go to Employees > Update employees > Import from a spreadsheet > Add employees. Download the template, fill in name, work email, and National ID Number (NIN), then upload and click Confirm and import. After upload a security check runs — Low requires one click to confirm, Moderate asks you to type a phrase, High pauses the upload for Wellhub manual review. Check status under Employees > Upload history.'
  },
  {
    title: 'Setting up Smart Invites and automatic invitations',
    url: 'https://helpcenter.gympass.com/en-us/articles/smart-invites',
    excerpt: 'Smart Invites automatically send a personalised invitation to every new eligible employee and re-invite non-subscribers every 60 days. To enable: Settings > Communication > Invite your employees > select Smart Invites > Save. You can also add a custom sender name on the same page. For a one-time blast to all eligibles (Kick-off email), select Kick Off Invites, pick a date up to 30 days ahead, and confirm. Important: set the date before clicking Import on an upload or invitations send immediately.'
  },
  {
    title: 'Understanding employee statuses: Eligible, Member, Subscriber',
    url: 'https://helpcenter.gympass.com/en-us/articles/employee-statuses',
    excerpt: 'Eligible: employee is on your uploaded list and has access rights but has not yet created a Wellhub account. Member: employee created a Wellhub account but has not chosen a paid plan. Subscriber: employee has an active plan (including free trial, paused, or limited access). Paused: employee paused their subscription (15–30 days, once every 6 months). Cancelled: employee ended their subscription — monthly subscribers can re-subscribe freely; annual subscribers lose access for the rest of their year. Limited Access: employee was removed from the eligibility list but their plan has not expired yet. You can filter by status in the Employees tab to identify who needs a re-invitation.'
  },
  {
    title: 'How to check enrollment reports and track usage',
    url: 'https://helpcenter.gympass.com/en-us/articles/enrollment-reports',
    excerpt: 'Portal reports are in Dashboard & Reports (requires Analytics role). Key reports: Engagement Report — daily count of eligibles, members, subscribers. Subscribers Report — per-employee plan status (Active, Paused, Cancelled, Limited Access). Visit Details — every verified gym/studio/app visit per employee. Subscription History — full log of plan changes. Enrollment rate = Subscribers ÷ Eligible employees × 100. Target benchmarks: 27%+ by Month 1 for Wellhub+ clients, 9.7%+ without Wellhub+.'
  },
  {
    title: 'Running a Wellhub Challenge to boost enrollment',
    url: 'https://helpcenter.gympass.com/en-us/articles/challenges',
    excerpt: 'Challenges are free for all clients — no extra cost or setup. Average +35% enrollment lift. To create: Challenges > Create a challenge > choose preset or custom title > set duration (up to 30 days) and start date > select level > Publish. Non-subscribers can join step challenges by downloading the free Wellhub app, removing the sign-up barrier. Pre-built promotional assets (social posts, email templates, infographics) are at Challenges > View materials. Challenges cannot be cancelled once started.'
  }
];

async function searchHelpCenter(query) {
  const token = process.env.CONNECT_PLUS_TOKEN;

  // ── Live API (Connect+ credentials present) ───────────────────────────────
  if (token) {
    try {
      const url = `https://api.cx.gympass.com/requester/v1/search?q=${encodeURIComponent(query)}&locale=en-us&per_page=3`;
      const resp = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });
      if (!resp.ok) return [];
      const data = await resp.json();
      const articles = data.articles || data.results || data.data || [];
      return articles.slice(0, 3).map(a => ({
        title:   a.title   || a.name || '',
        url:     a.html_url || a.url  || '',
        excerpt: (a.body_text || a.body || a.excerpt || a.snippet || '').replace(/<[^>]+>/g, '').slice(0, 400)
      })).filter(a => a.title && a.excerpt);
    } catch (e) {
      console.error('Help center search error:', e.message);
      return [];
    }
  }

  // ── Test fixture mode (no token yet) ─────────────────────────────────────
  // Simple keyword match against fixture titles + excerpts
  const q = query.toLowerCase();
  const scored = HC_TEST_FIXTURES.map(a => {
    const text = (a.title + ' ' + a.excerpt).toLowerCase();
    const words = q.split(/\s+/).filter(w => w.length > 3);
    const score = words.reduce((n, w) => n + (text.includes(w) ? 1 : 0), 0);
    return { ...a, score };
  }).filter(a => a.score > 0).sort((a, b) => b.score - a.score);
  return scored.slice(0, 2);
}

// ── Models ────────────────────────────────────────────────────────────────
const ORCHESTRATOR_MODEL = 'claude-haiku-4-5';   // fast + cheap for routing
const AGENT_MODEL        = 'claude-sonnet-4-5';  // quality for answers

// ── Rules injected into every agent ──────────────────────────────────────
const SHARED_RULES = `You are Welli, Wellhub's onboarding assistant for HR admins.
Be direct and conversational — like a knowledgeable colleague, not a manual.
Give concise answers. Target 60–120 words. Only exceed 150 words for complex multi-step guides.
FORMAT RULES (strictly enforced):
- Never use asterisks or markdown bold (**text**). Never use headers like "Exact steps:" or "Why it matters:".
- For step-by-step instructions, use a numbered list: "1. Do this  2. Do that"
- For quick tips or options, use a bullet list: "- item"
- For a single highlighted action, start the line with → (e.g. "→ Go to Employees > Update employees")
- Use plain prose for everything else. Short paragraphs, one idea per line.
- No preamble ("Great question!", "Of course!", "Thanks for asking!", "Absolutely!", "Sure thing!", "Happy to help!").
Copy portal navigation paths VERBATIM from the knowledge section — never paraphrase or shorten them.
Do not end your reply with a question.
If asked about payroll deductions or third-party integrations: say "That's handled directly by your CS rep — reach out to them."
Only refer to contacting CS for: billing disputes, cancellation requests, legal questions, serious platform errors.
Never invent portal paths, features, or statistics not present in the knowledge section. If the question is genuinely outside your knowledge, say so briefly and suggest the Help Center (helpcenter.gympass.com) or the portal's live chat support.
GP STEP SIGNAL: If your answer fully explains how to complete one specific Golden Path step, append <<<GP:STEP_ID>>> at the very end of your response (nothing after it). Valid IDs: upload, invites, teaser, leadership, i2s, webinar, comms. Only append if the answer IS the complete how-to for that exact step — not for general questions.
ESCALATION SIGNAL: For billing disputes, cancellation requests, legal questions, or serious unresolvable platform errors ONLY — append <<<ESCALAR_CS>>> at the very end (after your explanation of why you're escalating). Do not escalate general how-to questions.
MILESTONE SIGNAL: If the user mentions they've completed all 7 Golden Path steps, hit a significant enrollment milestone (e.g. 20%+, 30%+), or achieved a major launch success — append <<<MARCO>>> at the very end of your celebratory response.`;

// ── Knowledge bases ───────────────────────────────────────────────────────
const KB = {

  PRODUCT_FAQ: `
Wellhub (formerly Gympass) is a corporate wellbeing benefit that gives employees access to gyms, fitness studios, wellness apps, and 1:1 expert sessions through a single employer-sponsored subscription. Companies contract with Wellhub and pay a monthly prepaid fee; their employees then activate a personal plan and use it freely.

EMPLOYEE STATES: Eligible = on the uploaded list with access rights. Member = created a Wellhub account, no active plan. Subscriber = on an active plan (including free trial, paused, or limited access). Family Member = dependent enrolled via the Family Members add-on.

PLANS: Four paid tiers + one free tier. All paid tiers include gym + studio access, wellness apps (50+ apps), and live/on-demand classes. Each higher tier adds 1:1 virtual coaching sessions:
- Basic: gym/studio access, wellness apps, classes. No 1:1 sessions.
- Silver: everything in Basic + physiotherapy sessions (1:1 virtual).
- Gold: everything in Silver + nutrition coaching (1:1 virtual).
- Platinum: everything in Gold + financial coaching (1:1 virtual).
- Digital (free): wellness apps and live/on-demand classes only — no in-person gym access, no 1:1 sessions. Good for remote employees.
Plans cost up to 60% less than retail gym prices. If Wellhub+ is enabled, the company subsidizes part or all of the plan cost. Trainiac (personal training) is available from Silver tier upward.
PLAN COMMITMENT: Monthly plans can be cancelled and re-subscribed at any time — full flexibility. Annual plans are a 12-month commitment; employees are locked in for the full year.
PAUSE: Employees can pause their subscription once every 6 months for 15–30 consecutive days. After using a pause, they must wait 6 months before pausing again — but they can still cancel at any time during that 6-month window if needed.
PAUSE VS CANCEL GUIDANCE: Recommend pause for short, planned breaks under 30 days (vacation, injury). Recommend cancel for longer breaks or uncertain timelines — monthly subscribers can always re-subscribe with no restrictions. Annual subscribers who cancel still lose access for the remainder of their year.

ADD-ONS (company level): Family Members (employees add up to 3 dependents), Global Digital Plan (digital-only for regions without in-person partners), Wellhub+ (company subsidizes part or all of employee plan costs — enabling this restricts employee additions to spreadsheet-import only).

EMPLOYEE EXPERIENCE: Employees download the Wellhub app, sign up with their work email, choose a plan, and book or visit partner facilities or apps to log usage. A visit is a verified booking. Active User = 5+ visits per month. Employees on monthly plans can cancel and re-subscribe freely. Annual plan employees are locked in for 12 months. Any employee can pause once every 6 months (15–30 consecutive days); cancellation is always available even after a recent pause.

ROI BENCHMARKS: 90% of HR leaders measuring wellness ROI see a positive return. 89% report fewer sick days. 47% lower absenteeism for active users. Up to 35% reduction in healthcare costs. Average client ROI = 127%. 52% of clients report a significant productivity increase. Turnover is 30% lower among actively engaged Wellhub employees. 93% of workers prioritize wellbeing as much as salary.

TRAINIAC: Wellhub's personal training service — assigned certified coach, 100% personalized plans, daily follow-up, video library, progress tracking. Available from Silver tier.
WELLHUB AI: AI-powered conversational wellness assistant in the employee app (beta).
CHALLENGES: Free feature for all clients. Employees earn points via steps, gym visits, and class bookings. Non-subscribers can join step challenges by downloading the free app.
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

EMPLOYEE DIDN'T RECEIVE INVITATION EMAIL: 1. Confirm the employee is on the eligibility list (Employees tab — search by name or email). 2. Confirm their email address is correct and has no typos. 3. Ask the employee to check spam/junk, and search for "Wellhub" or "Gympass." 4. If eligible and email is correct: re-send manually (Employees > select employee > arrow > "Send invitation" or "Resend invitation"). 5. Share the Magic Link as an alternative — employees can sign up without the email. 6. Ask the employee's IT team to safelist Wellhub sending domains (IPs and domains list available from your CS rep). 7. If the employee status shows "Missing email," update the profile before inviting.

UPLOAD SECURITY CHECKS: After an employee list upload, a security check runs. Low = review and confirm with one click. Moderate = type a confirmation phrase to proceed. High = upload is paused for Wellhub's manual review team — the client must wait for Wellhub to approve it before invitations can send. If stuck on High, contact support.wellhub.com or use the portal live chat.

SUPPORT: clients.gympass.com | support.wellhub.com | Live chat Mon–Fri 9:00–18:00 ET; after-hours requests responded to within 1 business day.
`,

  LAUNCH_READINESS: `
THE GOLDEN PATH (7 steps — IDs in parentheses are used in the system):
Step 1 — UPLOAD YOUR EMPLOYEE LIST (id: upload, Portal Setup): Employees > Update employees > Import from a spreadsheet > Add employees > download template > fill name/email/NIN > upload > Confirm. Must be done before any invitations can be sent.
Step 2 — CONFIGURE SMART INVITES (id: invites, Portal Setup): Settings > Communication > Invite your employees > Smart Invites (recommended) — auto-invites new eligibles and re-invites non-subscribers every 60 days. Optionally add a sender name on the same page.
Step 3 — TEASER (id: teaser, Pre-Launch, 1–2 weeks before launch): Post early awareness on internal channels — email, Slack, intranet, posters, digital screens. Goal: employees see Wellhub before the invitation arrives.
Step 4 — LEADERSHIP ANNOUNCEMENT (id: leadership, Pre-Launch, launch day or day before): A message from a leader using Wellhub-supplied copy confirming the benefit is real and supported. This builds trust and is the single highest-impact action.
Step 5 — I2S — INVITATION TO SIGN UP (id: i2s, Launch Day): The Kick-off email sends automatically from the portal with a Magic Link. Employees click and sign up in minutes.
Step 6 — WELCOME WEBINAR (id: webinar, Week 1 Post-Launch, ~1 week after launch): Free 30-min live session hosted by Wellhub — HR doesn't need to prepare anything. HR picks a date 1–2 weeks after launch, shares the Zoom/Teams link with employees, and Wellhub runs it. Covers product features, plan selection, and employee Q&A. To book: contact your CS rep or check with your onboarding team — they'll provide a calendar link. Promote it via Slack, email, and internal channels before launch.
Step 7 — COMMUNICATION ASSETS (id: comms, Ongoing, Month 2+): Wellhub provides a monthly ready-made communications pack — emails, social posts, challenge templates, digital content. HR's only job is to forward and share. Three access points: (1) Momentum Program: digital.gympass.com/momentum-program/us/ — monthly packs, webinar calendar, toolkits; (2) portal homepage > Communication section — email templates; (3) Brand Library: wellhub.bynder.com — posters, GIFs, videos, social posts, challenge graphics. Share on Slack, email, intranet, or digital screens. Also run a Challenge each quarter — average +35% enrollment lift. Pair each challenge with a raffle for new subscribers.

ENGAGEMENT IMPACT DATA (use these exact figures): With Wellhub+, engaged clients reach 27.4% enrollment at Month 1, 35.1% at Month 3, 41.3% at Month 6 — vs. 5.4%, 7.5%, 10.2% for non-engaged. Without Wellhub+, engaged clients reach 9.7% at Month 1, 13.2% at Month 3, 21.7% at Month 6 — vs. 1.1%, 1.0%, 1.4% for non-engaged.

INTERNAL ANNOUNCEMENT TEMPLATE:
Subject: A new wellness benefit just for you
Body: Hi [team name], [Company] is excited to offer Wellhub — access to 40,000+ gyms, studios, and wellness apps. Sign up at [Magic Link]. Questions? Contact HR.

I2S SETUP STEPS: Upload eligibility file (Employees > Update employees > Import from a spreadsheet > Add employees) > expand Smart Invites section > click "View Invite Settings" > select send date up to 30 days ahead (or use Wellhub's recommended window) > scroll to acknowledgement > click Import > click "Kick Off Invites." The date MUST be selected before clicking Import — skipping it sends invitations immediately. After upload, share Wellhub's email safelisting document (IPs and domains) with the client's IT team to prevent delivery failures.

WELLHUB+: An optional add-on where the company subsidizes part or all of the employee plan cost — the single biggest enrollment driver (companies with subsidies see 3–5x higher sign-up rates). IMPORTANT: whether a company has Wellhub+ and the subsidy amount are BOTH set at contract time, not configurable by HR admins in the portal. Do NOT suggest "configure your Wellhub+ subsidy" as an action — the admin cannot change it. If an admin asks about Wellhub+: tell them to check Settings to see if it's enabled for their account, explain the enrollment impact, and direct any questions about changing the subsidy amount to their CS rep. When Wellhub+ is active, employee additions are restricted to spreadsheet-import only (no "Add one at a time").

FORMAL ONBOARDING MILESTONES (EU T1/T2): M0 = internal alignment (3 days post-Opp Won). M1 = Strategy Meeting (led by CS). M2 = Communication Strategy session (D-30 before launch, led by WE team — client must sign off the Core Strategy Launch Plan). W4C Training = eligibility file upload training (5–10 days before launch). Post-launch checkpoints: FV Track at D7, Health Checkpoint D15, Growth Checkpoint D30 and D60.
`,

  ENROLLMENT_SPRINT: `
ENROLLMENT BENCHMARKS: Engaged clients with Wellhub+ hit 27.4% enrollment at Month 1, 35.1% at Month 3, 41.3% at Month 6. Without Wellhub+: 9.7% at Month 1, 21.7% at Month 6. Non-engaged clients average 1–5% across the same periods. Top-quartile clients hit 27%+ by Month 1.

CHECK ENROLLMENT: Dashboard & Reports section of the admin portal (requires Analytics role). The homepage shows at-a-glance counts of eligible employees, members, subscribers, and visits. Full reports:
- Engagement Report: daily count of eligibles, members, subscribers, family members. Tracks subscription rate over time.
- Subscribers Report: current plan status per employee (Active, Paused, Cancelled, Limited Access). Active = current paying subscriber. Paused = subscription on hold (employee paused for 15–30 days; allowed once every 6 months — employee can still cancel even while in the 6-month pause cooldown). Cancelled = employee ended their subscription (monthly subscribers can re-subscribe anytime; annual subscribers lose access for the remainder of their year). Limited Access = employee was removed from the eligibility list but their plan has not yet expired — they can still access Wellhub until the current period ends, after which access stops.
- Visit Details: every verified gym/studio/app visit per employee. Measures active usage.
- Subscription History: full chronological log of plan changes. Use to audit changes or spot churn.
Enrollment rate = (Subscribers ÷ Eligible employees) × 100. Target: 27%+ by Month 1 (engaged clients with Wellhub+), 9.7%+ without Wellhub+.

POST-LAUNCH CHECKPOINTS:
D7 — First Value (FV) Track: confirm that at least one employee has created a Wellhub account and made a visit (gym, app usage, or class booking). Check via Dashboard & Reports > Visit Details. If nobody has visited yet, manually re-invite a small group of enthusiastic employees and promote the Welcome Webinar immediately. D7 is the earliest signal of adoption — low FV at D7 predicts low Month-1 enrollment.
D15 — Health Checkpoint: review your enrollment rate (Subscribers ÷ Eligibles). Compare to benchmarks: 27%+ is on track for Wellhub+ clients, 9.7%+ for non-Wellhub+. If below target: re-invite non-subscribers manually, promote the Welcome Webinar if it hasn't happened yet, and ask leadership to send a re-announcement message.
D30 — Growth Checkpoint: check overall subscription rate and visit frequency. If below target: run a Challenge (average +35% enrollment lift), do a second leadership message, share Wellhub's monthly comms assets, and consider a raffle to reward new subscribers.
D60 — Growth Checkpoint: plan the next quarter's engagement calendar. Review which GP comms you've done and which are still pending. Commit to at least one Challenge per quarter. Assess whether D2E (Direct to Employee) is enabled — contact CS if not. Reference the Momentum Program for monthly HR-ready assets and webinars.

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
STAGE 3 OVERVIEW — LIFE AFTER LAUNCH: HR's job in Stage 3 is simple: Wellhub provides everything, HR forwards and shares it. There are four core pillars: (1) Monthly email pack, (2) Content library, (3) Monthly employee webinars, (4) Team challenges. None of these require HR to create content.

MONTHLY COMMUNICATIONS PACK (core Stage 3 action): Every month, Wellhub prepares a ready-made pack of emails, social posts, challenge templates, and digital content — HR's only job is to forward the email and share the assets on internal channels (Slack, email, intranet, digital screens). The more frequently HR shares, the higher the enrollment rate. Where to access:
- Momentum Program: digital.gympass.com/momentum-program/us/ — monthly packs, challenge guides, webinar calendar, and HR Insider briefing.
- Portal: Homepage > Communication section — email templates and campaign materials.
- Brand Library (Bynder): wellhub.bynder.com — posters (A3/A4), flyers, social posts, GIFs, email templates, challenge graphics, digital screen banners, and employee videos. Download and share freely.
HR does not need to create any content. Recommended cadence: share at least once per month across at least 2 channels.

MONTHLY EMPLOYEE WEBINARS: Wellhub runs monthly employee-facing webinars at no cost. Two formats:
- "Say Hello to Wellhub" — recurring onboarding session for new and unconverted employees: covers plan options, how to sign up, popular features, and live Q&A.
- Themed monthly sessions — rotating wellbeing topics (stress, sleep, nutrition, financial health, emotional health, etc.).
HR's role is only to share the calendar link — Wellhub handles hosting, content, and presenting. To get the calendar link: check the Momentum Program page (digital.gympass.com/momentum-program/us/) or ask your CS or WE team rep. UK/IE event registration: promo.wellhub.com/uki/calendar/. Share the link via Slack, email, or a calendar invite to all employees.

WELLBEING CONTENT LIBRARY: Curated wellbeing content available for HR to share with employees at any time:
- wellhub.bynder.com (Brand Library) — employee how-to videos, benefit explainer videos, infographics, digital screen banners, social posts, and challenge graphics.
- Momentum Program (digital.gympass.com/momentum-program/us/) — monthly themed content packs, the Employee Engagement Toolkit, New Hire Toolkit, Challenges Toolkit, and the Wellness Pulse newsletter.
No portal configuration needed. Download any asset and share on Slack, email, intranet, or digital screens.

TEAM CHALLENGES (highest-impact Stage 3 tool): Free feature included in all Wellhub contracts — no extra setup or cost required. Average +35% enrollment lift (Wellhub internal study, 2024). Non-subscribers can join step challenges by downloading the free Wellhub app — no plan required, which removes the sign-up barrier.
CREATE A CHALLENGE: Challenges > Create a challenge > choose preset or custom title > set duration (up to 30 days) and start date > select level > Publish challenge. Once live: real-time participation rate, points, days remaining, and leaderboard visible. Pre-built promotional assets (social posts, email templates, infographics): Challenges > View materials.
CHALLENGE CADENCE: Minimum 1 challenge per quarter. Best results when paired with a raffle for new subscribers during the challenge period. Challenges cannot be cancelled once started — only before the start date.
RAFFLES: Best run alongside a challenge, with at least 3 weeks of promotion across at least 2 channels. Winners are selected from new subscribers during the period. Wellhub sponsors the prize — prizes cannot be plan discounts or free trials.

EEP (EMPLOYEE ENGAGEMENT PLAN): A co-created annual wellbeing plan between Wellhub's WE (Wellbeing Engagement) team and the client. Four content blocks:
Block 1 — Awareness: update intranet, benefits page, monthly newsletters with current Wellhub service info.
Block 2 — 1:1 Tools Awareness: promote personalized sessions (psychologists, physiotherapists, nutritionists, personal trainers via Trainiac, financial coaches) available at different plan tiers.
Block 3 — Cross-Client Events: monthly free seasonal events, raffles, challenges, and webinars from Wellhub's shared calendar.
Block 4 — Quarterly Communication Plan: live seminars, fitness sessions, testimonials, zone-segmented actions, Wellhub challenges, and wellbeing materials.
EEP CADENCE: 1 initiative per quarter, 3–6 months of planning ahead. Contact your WE team rep to start.

MOMENTUM PROGRAM (free HR resource hub): digital.gympass.com/momentum-program/us/ — Employee Engagement Toolkit, New Hire Toolkit, Challenges Toolkit, monthly employee webinars, monthly HR insider briefing (30-min Wellhub Monthly Insider covering roadmap and platform updates), and the Wellness Pulse newsletter (50,000+ HR members).

D2E (DIRECT TO EMPLOYEE): Wellhub-driven weekly personalized messages sent to all opted-in employees at no extra cost. Companies using D2E see significantly higher participation. Managed entirely by Wellhub — HR doesn't create any content. To enable: contact your CS rep or WE team lead. Employees opt in through the Wellhub app.

ANNUAL CAMPAIGN CALENDAR (UK/IE): Gympass Moves (Jan–Feb), Spring Fling (Mar–May), Check-in with your Wellbeing (Jun–Aug), Back to Basics (Sept–Oct), Winter Wellbeing (Nov–Dec). Registration: promo.wellhub.com/uki/calendar/

FIND YOUR PATH: Interactive quiz delivering personalized plan recommendations to employees — converts free members to paid plans. Available to clients on an approved list — ask CS.

WELLBEING CHAMPIONS MODEL: Nominated employee advocates equipped via WC Calls; they become brand ambassadors driving word-of-mouth adoption across the workforce.

KEY LONG-TERM BENCHMARKS: 90% of HR leaders measuring wellness ROI see positive returns. 89% report fewer sick days. 47% lower absenteeism for active users. Average client ROI = 127%. Celebrate milestone enrollment: 10%, 20%, 27%+ — pair each milestone with a raffle or challenge.
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
ENGAGEMENT_RETENTION — Month 2+ long-term engagement: monthly communications pack, content library (Bynder/Momentum Program), monthly employee webinars, team challenges, EEP, WE program, Scalable Menu, Momentum Program, annual campaigns, raffles, Wellbeing Champions, D2E; also "what's my next step" questions in Stage 3

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

    // Post to GitHub Issues so feedback survives the serverless environment
    try {
      const issueBody = [
        `**Stage:** ${phase}/3`,
        `**Company:** ${company || 'Not set'}`,
        `**Time:** ${new Date().toISOString()}`,
        `---`,
        feedbackText
      ].join('\n');

      await fetch('https://api.github.com/repos/renatocastelo-smb/welli-onboard-agent/issues', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28'
        },
        body: JSON.stringify({
          title: `Feedback: ${feedbackText.substring(0, 72)}`,
          body: issueBody,
          labels: ['feedback']
        })
      });
    } catch (e) {
      console.error('Feedback GitHub error:', e.message);
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
      else {
        const abs = Math.abs(daysToLaunch);
        const months = Math.floor(abs / 30);
        const launchStr = months >= 1
          ? `${months} month${months !== 1 ? 's' : ''}`
          : `${abs} day${abs !== 1 ? 's' : ''}`;
        const checkpoint = abs >= 5 && abs <= 10
          ? ' — D7 First Value checkpoint: confirm at least one employee has signed in and checked in.'
          : abs >= 13 && abs <= 18
          ? ' — D15 Health Checkpoint: prompt review of enrollment numbers in the portal now.'
          : abs >= 28 && abs <= 36
          ? ' — D30 Growth Checkpoint: help them check enrollment rate and plan next action.'
          : abs >= 58 && abs <= 66
          ? ' — D60 Growth Checkpoint: encourage next challenge, raffle, or comms push.'
          : '';
        clientLines.push(`Already launched ${launchStr} ago${checkpoint}`);
      }
    }
    if (goldenPath) {
      clientLines.push(`Golden Path: ${goldenPath.completed}/${goldenPath.total} steps complete.`);
      if (goldenPath.doneSteps?.length)    clientLines.push(`Completed steps: ${goldenPath.doneSteps.join(', ')}.`);
      if (goldenPath.nextPending)          clientLines.push(`Next pending step: "${goldenPath.nextPending}".`);
      if (goldenPath.pendingSteps?.length > 1) clientLines.push(`Remaining steps: ${goldenPath.pendingSteps.slice(1).join(', ')}.`);
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

    // ── Step 1b: Fetch relevant Help Center articles (Connect+ KB) ───────────
    const hcArticles = await searchHelpCenter(message);
    const hcContext = hcArticles.length
      ? '\n\nHELP CENTER ARTICLES (official Wellhub support documentation — use these to supplement your answer):\n' +
        hcArticles.map((a, i) => `[${i + 1}] ${a.title}\n${a.excerpt}`).join('\n\n')
      : '';

    // ── Step 2: Answer via Specialist Agent (Sonnet — quality) ───────────
    const systemPrompt = [
      SHARED_RULES,
      `\nYour specialty: ${agent.specialty}`,
      gpCtx ? `${gpCtx}\n\nUse the client context above to personalise your answers. When days until launch is low (≤7), flag urgency explicitly. When the client asks "what's my next step", give one concrete action: name it, explain why it matters, and give the exact steps to do it right now.` : '',
      `\nKNOWLEDGE:\n${KB[agentKey]}`,
      hcContext
    ].join('\n');

    // Keep last 8 messages (4 turns) for better multi-turn continuity
    const messages = [
      ...history.slice(-8),
      { role: 'user', content: message }
    ];

    const answer = await anthropic.messages.create({
      model: AGENT_MODEL,
      max_tokens: 900,
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
