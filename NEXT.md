# Welli — Next Session Continuation

## Current state (commit 84b19d7 + latest deploy)

The intro flow, FAQ tracking, and core experience are all stable and deployed at https://welli-theta.vercel.app.

---

## What is done ✅

### Intro flow (4 steps)
1. **Step 1 — Overview**: The 3 stages explained, Stage 1 pill highlighted
2. **Step 2 — Admin Portal**: W4C navigation (Home, Employees, Dashboard, Billing, Subscription, Settings, Help) + portal link
3. **Step 3 — FAQ**: 6 HR admin FAQs + 6 employee FAQs, live-sorted by click popularity via Upstash Redis
4. **Step 4 — Golden Path**: Launch date picker → date badge + all 7 GP steps revealed, each clickable, checkable (fades when done), with builder hint panels for Teaser and Announcement

### FAQ tracking infrastructure
- `api/faq-track.js` — POST endpoint, increments click counter in Upstash KV
- `api/faq-top.js` — GET endpoint, returns questions sorted by popularity (60s CDN cache)
- `@vercel/kv` package wired to `welli-kv` Upstash store (free tier, connected)
- Frontend fetches live order on step load; falls back gracefully to default

### Builder integration
- Teaser and Leadership announcement cards in intro GP list show expandable dark hint panel
- "Open Builder →" completes intro + opens the builder with a pre-filled Welli prompt
- Back button returns to intro GP list (introStep preserved)
- Both builders fixed to use `showTeaserScreen()` / `showAnnounceScreen()` (not raw `showPanel`)

### Progress strip
- Stage 1 highlighted during intro steps 1–3; Stage 2 highlighted on step 4
- GP row hidden during intro

### Chat
- One-time contextual message on FAQ step ("Here are the most common questions…")
- One-time contextual message on GP step ("Now let's map out your launch…")
- No duplicate messages on back/forward navigation

### Other
- "Create a teaser" chip removed from chat rail
- Engagement chart on step 4 is dismissable; hides after launch date is set
- GP step cards: checkbox marks done (fades card, syncs with main app gpState), builder hint closes on check

---

## What to do next ❌

### Priority (user's stated focus)
1. **KB improvements** — review `api/chat.js` knowledge base for accuracy, completeness, and gaps. Specific areas to check:
   - Wellhub+ / subsidy details (already corrected once — double-check)
   - I2S / Smart Invites setup steps
   - Multi-country / international specifics
   - Employee FAQ answers (free vs paid, family members, cancellation)
   - Stage 3 engagement content (challenges, raffles, monthly comms cadence)

2. **Support agent connection** — connect Welli to Wellhub's existing support agent / ticketing system. Details TBD. Likely involves:
   - Identifying the support platform (Zendesk, Intercom, Salesforce, etc.)
   - Creating a structured handoff (client context + conversation summary)
   - Replacing or enhancing the current `<<<ESCALAR_CS>>>` inline signal

### On hold (revisit later)
- Richer onboarding profile (company size, industry, country → personalise AI)
- Proactive urgency engine (detect launch proximity + missing GP steps)
- Shareable launch link (multi-admin collaboration)
- CS handoff card (auto-summary for CS reps)
- Aggregate analytics / internal dashboard
- Launch day celebration experience
- Employee companion mode

---

## How to resume

Open a new session and say:
> "Continue Welli — read NEXT.md for context."

Read this file, then read `CLAUDE.md` for full project context, then read `api/chat.js` for the current KB.

## Key files

- `index.html` — entire frontend (CSS, HTML, JS inline, no build step)
- `api/chat.js` — Vercel serverless function (AI orchestration + knowledge base)
- `api/faq-track.js` — FAQ click tracking endpoint
- `api/faq-top.js` — FAQ popularity sort endpoint
- `CLAUDE.md` — full project context (read this first on any new session)
