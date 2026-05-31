# Welli Feedback Log

Feedback captured from sessions and user testing. Use these to update the KB in `api/chat.js`.
Status: ✅ Fixed | 🔄 In Progress | ⏳ Pending

---

## UX / Flow

- ✅ Remove "Let's get started" CTA button from intro step 0
- ✅ Remove "Skip all" button from intro step 0
- ✅ Fix duplicate chat messages when user navigates back and forth between intro steps
- ✅ After launch date is set: remove the engagement chart, show date badge at top, auto-reveal the 7 GP steps underneath
- ✅ Remove "Reveal" button mechanic — show the full Golden Path directly instead
- ✅ Rename "Schedule the Kick-off email (I2S)" → "Schedule the Kick-off email"
- ✅ Add deadline dates to each GP step (e.g. "21 days before launch") with urgency colour coding
- ✅ Make each GP step card clickable — clicking asks Welli the right question for that step
- ✅ Make GP steps checkable — fade the card when marked done
- ✅ Fix hint panel staying open after user ticks the checkbox on a GP step
- ✅ Fix Teaser builder opening to a blank screen — now calls showTeaserScreen() correctly
- ✅ Fix clicking a builder (Teaser / Announcement) breaking the intro flow on Back
- ✅ Remove "Create a teaser" builder hint from the intro GP list (caused too much friction)
- ✅ Add FAQ step as a new intro step between Portal and Golden Path
- ✅ Fix Stage 3 being unreachable when user is still in the intro GP view (mudarFase guard)
- ✅ Change split-panel layout from 50/50 → 62/38 (content panel wider)
- ✅ Fix FAQ buttons in intro step 2 not sending questions to chat (root cause: JSON.stringify wraps strings in double quotes, breaking onclick attribute parsing — fixed with .replace(/"/g, '&quot;'))
- ✅ Fix clicking a FAQ in intro completing the intro and replacing the content panel with Stage 1 overview — removed completeIntro() from covAskWelli entirely; FAQ step stays visible while answer appears in chat
- ✅ Make portal section items (Home, Employees, Dashboard, etc.) clickable in intro step 1 — each sends a contextual question to Welli with "Ask Welli →" hover hint
- ✅ Move email reminder card to top of intro step 3 (above GP list) — add × dismiss button; auto-fade after 4 seconds on confirmation

---

## Features

- ✅ Make FAQ live-sorted by click popularity (Upstash Redis + /api/faq-track + /api/faq-top)
- ✅ Add email reminder system: collect email in intro, send 7 GP step reminder emails via Resend on a daily Vercel Cron
- ✅ Fix video embed: replace broken Google Drive iframe with W4C.mov as a native <video> static asset
- ✅ Redesign Stage 3 ("Life After Launch") around two pillars: monthly comms (forward model) + sustain engagement (content library, webinars, challenges)
- ✅ Update KB in api/chat.js for Stage 3 — added dedicated sections for Monthly Communications Pack, Monthly Employee Webinars, Wellbeing Content Library, Team Challenges cadence; updated Step 7 in LAUNCH_READINESS; updated orchestrator routing description
- ⏳ Connect Welli to Wellhub's existing support agent (held — future session)

---

## Infrastructure

- ✅ Set up Upstash Redis (welli-kv) via Vercel marketplace for FAQ tracking + reminder storage
- ✅ Switch from @upstash/redis to @vercel/kv (reads KV_REST_API_* env vars set by Upstash marketplace)
- ✅ Add CRON_SECRET to Vercel production — daily cron can now authenticate and fire
- ⏳ Fix RESEND_API_KEY typo in Vercel (currently saved as RESENT_API_KEY) — user needs to paste correct value
- ⏳ Decide sender domain strategy before going live: verify full wellhub.com in Resend (needs IT/DNS access) vs. delegate notifications.wellhub.com subdomain (simpler IT ask). On hold pending decision.

---

## Content / Copy

- ✅ Stage pill labels updated to: "Stage 1: Get to Know Wellhub for Companies" / "Stage 2: Get Ready to Launch" / "Stage 3: Life After Launch"
- ✅ GP step "Host the Welcome Webinar" — description updated to reflect it's a free Wellhub-run session
- ✅ Stage 3 hero copy: "We'll handle the launch comms for you — just hit forward"
- ✅ Terminology: "check-in" → "visit/visits" throughout (portal walkthrough card, Stage 3 challenges tile, Dashboard label in intro step 1, Visit Details report label in KB)

---

## Known Issues (open)

- ⏳ Reminder emails blocked until sender domain decision is made (see Infrastructure above) and RESEND_API_KEY typo is fixed
