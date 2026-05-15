# Welli — Claude Code Project Context

This file gives Claude Code the context it needs to contribute to Welli effectively.
Read this before making any changes.

---

## What is Welli?

Welli is an AI-powered onboarding assistant for Wellhub's B2B clients (HR admins at companies
that have purchased Wellhub as an employee benefit). It lives at https://welli-theta.vercel.app.

Its job: guide HR admins from "just signed the contract" through a successful Wellhub launch
and into ongoing engagement — replacing manual CS touchpoints with an intelligent chat interface.

---

## File Structure

```
welli/
├── index.html        ← Entire frontend. One file. All CSS, HTML, JS inline.
├── api/
│   └── chat.js       ← Vercel serverless function. All AI logic lives here.
├── .env.local        ← API keys (NEVER commit this file)
├── .gitignore
├── CLAUDE.md         ← This file
├── CONTRIBUTING.md   ← Onboarding guide for contributors
└── feedback.md       ← User feedback log (update KB from here)
```

---

## Architecture

### Frontend (`index.html`)
Single-file app. No build step, no framework, no package.json dependencies.

**Screen flow (first-time user):**
```
Welcome Kit overview → W4C Slides (4 slides) → Setup screen →
Engagement chart → Path to Success → Chat (split-panel layout)
```

**Returning user:** skips directly to Chat (controlled by `welli_seen_welcome` in localStorage).

---

### Split-Panel Layout (post-intro)

After the intro flow, the shell expands to 960px and shows a two-column layout:

```
┌──────────────────────────────────┬───────────────────────┐
│  Content Panel (55%)             │  Chat Panel (45%)     │
│  ─────────────────               │  ─────────────────    │
│  Stage nav pills (1 / 2 / 3)    │  Phase bar            │
│  Context cards (benefits,        │  GP progress row      │
│    GP checklist, actions)        │  Status bar           │
│  Builder views (teaser,          │  Messages             │
│    announcement)                 │  Quick-reply chips    │
│                                  │  Input footer         │
└──────────────────────────────────┴───────────────────────┘
```

On mobile (< 720px): full-screen shell with a tab bar ("Content" | "Chat").

**Content panel key classes:**
- `.content-panel` — left column (55% on desktop, full-screen on mobile)
- `.chat-panel` — right column (45% on desktop)
- `.cp-view` / `.cp-view.cp-active` — view switching inside content panel
- `.mp-hidden` — hides a panel on mobile only (no effect on desktop ≥720px)
- `.shell-wide` — expands shell from 420px to 960px after intro completes
- `.mobile-tabs` — hidden on desktop; shows Content/Chat tab bar on mobile

**Content panel views:**
- `#cp-overview` — stage-specific cards (default view)
- `#cp-teaser` — Teaser Builder
- `#cp-announce` — Announcement Builder

---

**Key JS globals:**
- `faseAtual` — current stage (1, 2, or 3)
- `gpState` — object of completed Golden Path steps (persisted to localStorage)
- `hist` — conversation history array (last 6 turns sent to API)
- `chatInitialized` — prevents duplicate welcome messages
- `jumpedFromIntro` — true when user skips intro via the persistent input bar

**Key functions:**
- `showChat()` — initialises chat, expands shell, calls `renderPanelOverview()`
- `renderPanelOverview()` — generates content panel HTML for current stage
- `showPanel(view)` — switches content panel view ('overview'|'teaser'|'announce')
- `switchMobileTab(tab)` — switches mobile tab ('content'|'chat'); no-op on desktop
- `toggleCovStep(id)` — checks/unchecks a GP step from the content panel
- `covAskWelli(question)` — pre-fills chat input with a question and sends it
- `renderChips()` — rebuilds the quick-reply chip row
- `askNextStep()` — builds a rich internal prompt for the "next step" smart chip
- `sendDirect(displayText, internalMsg)` — sends with a different visible label vs internal prompt
- `renderGPAction(id)` — renders inline "Mark as done" button after a GP step answer
- `renderGPList()` — re-renders the GP slide-in panel list with group badges
- `showSendError(retryFn)` — shows error message with "↩ Try again" button
- `downloadAnnounce()` — downloads announcement as .txt file with company-named filename
- `daysUntilLaunch()` — returns days to/from launch date, parsed as local date (no UTC bug)
- `gpContext()` — builds GP context object with doneSteps[], pendingSteps[] arrays for API
- `setCovLaunchDate(val)` — saves launch date from inline date picker and re-renders
- `devReset()` — tap avatar 5× to wipe localStorage and restart (dev only)

**localStorage keys:**
| Key | Value |
|-----|-------|
| `welli_seen_welcome` | `'1'` when intro flow completed |
| `welli_company` | Company name string |
| `welli_launch_date` | ISO date string (YYYY-MM-DD) |
| `welli_stage` | `'1'` | `'2'` | `'3'` — last stage viewed (persists across sessions) |
| `welli_gp` | JSON object `{ upload: true, invites: false, ... }` |

### Backend (`api/chat.js`)
Vercel serverless function. Called by `fetch('/api/chat', ...)` from the frontend.

**Two-step orchestration:**
1. **Haiku classifier** — reads the message + stage, routes to 5 specialist agents:
   `PRODUCT_FAQ` | `PLATFORM_SUPPORT` | `LAUNCH_READINESS` | `ENROLLMENT_SPRINT` | `ENGAGEMENT_RETENTION`
2. **Sonnet responder** — uses the KB, client context, and conversation history to answer

**Inline signals** — Sonnet appends special tokens the frontend strips and acts on:
- `<<<GP:step_id>>>` → shows "Mark as done" button for that GP step
- `<<<ESCALAR_CS>>>` → shows escalation card with CS contact link
- `<<<MARCO>>>` → shows milestone celebration card (stage-aware)

**Client context injected into every prompt:**
- Company name
- Days until/since launch (urgency-flagged at ≤7 and ≤1 days)
- Golden Path progress: count, completed step names, next pending step, remaining steps
- Current stage (1/2/3)

---

## Coding Conventions

- **No external libraries.** CSS, JS, and HTML are all inline in `index.html`.
  Do not add npm packages or CDN imports without discussing first.
- **CSS variables** for all brand colours — use `var(--dp)`, `var(--mg)`, etc.
  Never hardcode hex values that match existing variables.
- **Naming**: screens are `#kebab-screen`, JS functions are `camelCase`,
  CSS classes are `kebab-case` with a short prefix per component:
  `.wk-` (welcome kit), `.w4c-` (W4C slides), `.eng-` (engagement screen),
  `.path-` (path to success), `.cov-` (content overview panel), `.gpp-` (GP panel).
- **Screen height**: intro screens are `490px`. The split-panel is `100dvh` on mobile, `calc(100dvh - 32px)` max `780px` on desktop.
- **Desktop/mobile breakpoint**: `720px`. Use `@media(max-width:719px)` and `@media(min-width:720px)`.
- **`mp-hidden`**: only adds `display:none` inside `@media(max-width:719px)`. Never check this class on desktop — check `window.innerWidth < 720` instead.
- **Animations**: use the existing `opacity + transform` pattern. No third-party animation libs.
- **No markdown headers in bot responses** — SHARED_RULES in `chat.js` prohibit `#` headers.
  The `renderMarkdown()` function in `index.html` handles bold, lists, arrows.
- **`renderPanelOverview()`** must always call `inner.parentElement.scrollTop = 0` at the end (or scroll to next-up for interactive updates via `toggleCovStep`).

---

## The Golden Path

7 steps that define a successful Wellhub launch. IDs must match between frontend and backend:

| ID | Title | Stage |
|----|-------|-------|
| `upload` | Upload your employee list | 2 |
| `invites` | Configure Smart Invites | 2 |
| `teaser` | Post a teaser on internal channels | 2 |
| `leadership` | Send the leadership announcement | 2 |
| `i2s` | Schedule the Kick-off email (I2S) | 2 |
| `webinar` | Host the Welcome Webinar | 2 |
| `comms` | Share monthly communication assets | 3 |

The GP row/panel is **only visible in Stage 2**.

---

## Stages

| Stage | Name | When |
|-------|------|------|
| 1 | Get to Know Wellhub | Days 1–3 |
| 2 | Get Ready to Launch | Pre-launch |
| 3 | Life After Launch | Month 1+ |

Switching stages resets `hist` and fires a new welcome message.

---

## How to Deploy

```bash
npx vercel --prod
```

Or: push to `main` on GitHub (if Vercel is connected to the repo — see CONTRIBUTING.md).

---

## Things NOT to Change Without Discussion

- The two-step Haiku → Sonnet orchestration pattern in `chat.js`
- The `<<<GP:step_id>>>` inline signal format (frontend and backend must stay in sync)
- The `welli_*` localStorage key names (changing them breaks returning users)
- The `W4C_TOTAL` constant without adding/removing a matching slide in the HTML
- The `devReset()` function — keep it, it's intentional
- The `GP_STEPS` array structure — `id` values must match the backend KB
- The `switchMobileTab()` no-op guard (`if (window.innerWidth >= 720) return`) — removing it breaks desktop layout
