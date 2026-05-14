# Contributing to Welli

Step-by-step guide to get set up and start contributing.

---

## Part 1 — Renato does this once (repo + Vercel setup)

> Skip to Part 2 if the repo already exists on GitHub.

### 1. Create the GitHub repo

1. Go to https://github.com/new
2. Name it `welli` (or `welli-onboarding`)
3. Set it to **Private**
4. Do NOT initialise with README, .gitignore, or licence (we have our own)
5. Click **Create repository**

### 2. Push the local project to GitHub

Open a terminal in the `welli/` folder and run:

```bash
git init
git add .
git commit -m "Initial commit — Welli onboarding assistant"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/welli.git
git push -u origin main
```

### 3. Connect Vercel to GitHub

1. Go to https://vercel.com/dashboard
2. Open the `welli` project → **Settings** → **Git**
3. Click **Connect Git Repository** → select the GitHub repo you just created
4. Set **Production Branch** to `main`
5. From now on, every push to `main` auto-deploys to production

### 4. Add the API key to Vercel (so production keeps working)

1. Vercel dashboard → welli project → **Settings** → **Environment Variables**
2. Add: `ANTHROPIC_API_KEY` = (your key from `.env.local`)
3. Scope: **Production + Preview + Development**
4. Save

### 5. Invite collaborators to GitHub

1. GitHub repo → **Settings** → **Collaborators** → **Add people**
2. Add each contributor by their GitHub username
3. They'll receive an email invite

### 6. Share the API key privately

Send each contributor the `ANTHROPIC_API_KEY` value via a secure channel
(Slack DM, 1Password, etc.). They need it locally. They must **never** commit it.

---

## Part 2 — Each contributor does this once

### Prerequisites

Make sure you have these installed:

```bash
node --version   # needs v18+
git --version    # any recent version
```

Install the Vercel CLI if you don't have it:

```bash
npm install -g vercel
```

Install Claude Code if you don't have it:

```bash
npm install -g @anthropic-ai/claude-code
```

### 1. Accept the GitHub invite

Check your email for the collaborator invite from GitHub and accept it.

### 2. Clone the repo

```bash
git clone https://github.com/RENATOS_USERNAME/welli.git
cd welli
```

### 3. Create your `.env.local` file

Create a file called `.env.local` in the root of the project:

```
ANTHROPIC_API_KEY=sk-ant-api03-...
```

Paste the key Renato shared with you. This file is gitignored — it will never be committed.

### 4. Link to the Vercel project (one-time)

```bash
vercel link
```

Follow the prompts — select Renato's team/account and the `welli` project.
This lets you run the project locally with the same serverless function setup.

### 5. Run locally

```bash
vercel dev
```

Open http://localhost:3000. You should see Welli running with the full intro flow.

**Dev tip:** Tap the **W avatar 5 times** to wipe localStorage and restart the intro flow from scratch.

---

## Part 3 — Day-to-day workflow

### Before starting any work

Pull the latest changes from main:

```bash
git pull origin main
```

### Create a feature branch

Never commit directly to `main`. Always work on a branch:

```bash
git checkout -b feature/your-feature-name
# examples:
# feature/url-prefill
# feature/content-generation
# fix/chips-not-showing
```

### Make your changes with Claude Code

Open Claude Code in the project folder:

```bash
claude
```

Claude Code will read `CLAUDE.md` automatically — it has all the project context,
conventions, and architecture notes. You don't need to re-explain the project each session.

### Test before pushing

- Run `vercel dev` and click through the relevant screens
- Tap the avatar 5× to reset and test the full intro flow if you changed intro screens
- Test on a narrow viewport (the shell is 420px wide — use browser DevTools device mode)

### Commit and push your branch

```bash
git add index.html api/chat.js   # be specific — don't use git add .
git commit -m "Short description of what and why"
git push origin feature/your-feature-name
```

### Open a Pull Request

1. Go to the GitHub repo
2. Click **Compare & pull request** (GitHub will prompt you)
3. Write a short description of what changed and why
4. Assign Renato as reviewer
5. Wait for approval before merging

### After your PR is merged

Vercel will automatically deploy to production within ~30 seconds.
Pull the latest main to keep your local copy up to date:

```bash
git checkout main
git pull origin main
```

---

## Project structure (quick reference)

```
welli/
├── index.html        ← Entire frontend (CSS + HTML + JS, all inline)
├── api/
│   └── chat.js       ← AI backend (Vercel serverless function)
├── .env.local        ← Your local API key (never commit)
├── .gitignore
├── CLAUDE.md         ← Architecture + conventions (read before coding)
├── CONTRIBUTING.md   ← This file
└── feedback.md       ← User feedback log
```

Read `CLAUDE.md` before making any changes — it explains the architecture,
naming conventions, and things that must stay in sync across files.

---

## Rules

| Rule | Why |
|------|-----|
| Never commit `.env.local` | Contains the API key — exposure = $$$ charges |
| Never push directly to `main` | All changes go through PRs so nothing breaks production |
| Always read `CLAUDE.md` first | Keeps everyone aligned on conventions |
| Test locally before opening a PR | `vercel dev` takes 5 seconds |
| Keep `index.html` self-contained | No external JS/CSS libs without discussion |
