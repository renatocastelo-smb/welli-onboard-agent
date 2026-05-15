# Welli — Next Session Continuation

## Current state (commit 4406e47)

The 3-component layout migration is **partially complete**.

### What is done ✅

1. **Progress strip** — full-width bar between the header and the content+chat split:
   - Three stage pills `[1 · Explore] [2 · Launch] [3 · Engage]` (clickable, switch stage)
   - GP progress bar in the centre (Stage 2 only, click opens GP panel)
   - Launch date / period on the right
   - CSS class: `.progress-strip` in `index.html`

2. **Chat panel cleaned up** — phase-bar, gp-row, and status-bar removed from inside the chat panel

3. **Content panel** — `#cov-stage-strip` div and `cov-snav` styles removed (stage nav now only in progress strip)

4. **Panel widths** — 50/50 instead of 55/45

5. **Mobile tabs** — moved to bottom of `#app-main` (was at top)

6. **Dead code removed** — `SB_CONTEXT`, `fase-nome`, `.phase-bar`, `.sb` CSS

### What still needs to be done ❌

The structural migration is done. What's likely still needed:

1. **Visual QA** — open the app locally (`npx vercel dev`) and verify:
   - Progress strip renders correctly at all 3 stages
   - GP bar appears only in Stage 2 and toggles the step panel
   - Stage pills highlight correctly when switching
   - Mobile: progress strip at top, tab bar at bottom
   - GP panel slide-in still works (slides over chat area)
   - Content panel has no leftover stage pill nav remnants

2. **Content panel header** — the `cov-hdr` block inside each stage (`renderPanelOverview`)
   still shows a `.cov-tag` chip with "Stage 1" / "Stage 2" / "Stage 3". This is now
   redundant since the progress strip shows the stage. Could remove the `.cov-tag` from
   each stage's HTML template in `renderPanelOverview()`.

3. **Progress strip: GP label** — currently shows "Golden Path · 0/7". The `updateGPProgress()`
   function updates `#gp-label` and `#gp-fill`. Verify this works in the new strip context.

4. **Progress strip height on mobile** — 46px strip + 3 pills might be tight on 320px screens.
   Check and add `@media(max-width:359px)` adjustments if needed.

5. **Deploy** — `npx vercel --prod` or push to main once visual QA passes.

## How to resume

Open a new session and say:
> "Continue the Welli 3-component layout migration — read NEXT.md for context."

I will read this file, read `index.html` and `api/chat.js`, and continue from item 2 above.

## Key files

- `index.html` — all frontend (CSS, HTML, JS inline, no build step)
- `api/chat.js` — Vercel serverless function (AI orchestration)
- `CLAUDE.md` — full project context (read this first on any new session)
