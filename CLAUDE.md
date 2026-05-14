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
Engagement chart → Path to Success → Chat
```

**Returning user:** skips directly to Chat (controlled by `welli_seen_welcome` in localStorage).

**Key JS globals:**
- `faseAtual` — current stage (1, 2, or 3)
- `gpState` — object of completed Golden Path steps (persisted to localStorage)
- `hist` — conversation history array (last 6 turns sent to API)
- `chatInitialized` — prevents duplicate welcome messages
- `jumpedFromIntro` — true when user skips intro via the persistent input bar

**Key functions:**
- `showChat()` — initialises chat for the first time
- `renderChips()` — rebuilds the quick-reply chip row
- `askNextStep()` — builds a rich internal prompt for the "next step" smart chip
- `sendDirect(displayText, internalMsg)` — sends with a different visible label vs internal prompt
- `renderGPAction(id)` — renders inline "Mark as done" button after a GP step answer
- `devReset()` — tap avatar 5× to wipe localStorage and restart (dev only)

**localStorage keys:**
| Key | Value |
|-----|-------|
| `welli_seen_welcome` | `'1'` when intro flow completed |
| `welli_company` | Company name string |
| `welli_launch_date` | ISO date string (YYYY-MM-DD) |
| `welli_gp` | JSON object `{ upload: true, invites: false, ... }` |

### Backend (`api/chat.js`)
Vercel serverless function. Called by `fetch('/api/chat', ...)` from the frontend.

**Two-step orchestration:**
1. **Haiku classifier** — reads the message + stage, returns intent key:
   `ONBOARDING` | `ESCALATE` | `FEEDBACK` | `MILESTONE`
2. **Sonnet responder** — uses the KB, client context, and conversation history to answer

**Inline signals** — Sonnet appends special tokens the frontend strips and acts on:
- `<<<GP:step_id>>>` → shows "Mark as done" button for that GP step
- `<<<ESCALAR_CS>>>` → shows escalation card with CS contact link
- `<<<MARCO>>>` → shows milestone celebration card

**Client context injected into every prompt:**
- Company name
- Days until/since launch
- Golden Path progress (X of 7 complete, next pending step)
- Current stage (1/2/3)

---

## Coding Conventions

- **No external libraries.** CSS, JS, and HTML are all inline in `index.html`.
  Do not add npm packages or CDN imports without discussing first.
- **CSS variables** for all brand colours — use `var(--dp)`, `var(--mg)`, etc.
  Never hardcode hex values that match existing variables.
- **Naming**: screens are `#kebab-screen`, JS functions are `camelCase`,
  CSS classes are `kebab-case` with a short prefix per component (`.wk-`, `.w4c-`, `.eng-`, `.path-`).
- **Screen height**: intro screens are `490px`. Chat content is auto-height.
- **Animations**: use the existing `opacity + transform` pattern. No third-party animation libs.
- **No markdown headers in bot responses** — SHARED_RULES in `chat.js` prohibit `#` headers.
  The `renderMarkdown()` function in `index.html` handles bold, lists, arrows.

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
