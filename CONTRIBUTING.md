# Getting Started with Welli — Complete Beginner Guide

No experience needed. Follow every step in order and you'll be up and running in about 20 minutes.

---

## Step 1 — Create a GitHub account

GitHub is where the code lives. You need a free account.

1. Go to https://github.com
2. Click **Sign up**
3. Enter your email, create a password, choose a username
4. Verify your email when they send you a confirmation

Then **send your GitHub username to Renato** so he can give you access to the project.
Wait for him to confirm before continuing.

---

## Step 2 — Create a Vercel account

Vercel runs the app locally on your computer for testing.

1. Go to https://vercel.com
2. Click **Sign up**
3. Choose **Continue with GitHub** — this links both accounts automatically

---

## Step 3 — Install Node.js

Node.js is what runs JavaScript on your computer. You need it for everything else.

1. Go to https://nodejs.org
2. Click the big **LTS** button (the recommended version)
3. Open the downloaded file and follow the installer — just keep clicking Next/Continue
4. When it's done, **restart your computer**

---

## Step 4 — Open the Terminal

The terminal is how you'll run commands. Don't worry — you'll only use a handful of them.

**On Mac:**
1. Press **Command (⌘) + Space** to open Spotlight
2. Type `Terminal`
3. Press Enter

**On Windows:**
1. Press the **Windows key**
2. Type `PowerShell`
3. Click **Windows PowerShell**

---

## Step 5 — Install the tools you need

Copy and paste each line below into the terminal, one at a time. Press Enter after each one.
Wait for it to finish before pasting the next.

```bash
npm install -g vercel
```

```bash
npm install -g @anthropic-ai/claude-code
```

If you see a long list of text scrolling by — that's normal, it's installing.
If you see `added X packages` at the end — it worked.

---

## Step 6 — Accept the GitHub invite

Renato will send you a collaborator invite to your GitHub email.

1. Check your email for a message from GitHub
2. Click **Accept invitation**

---

## Step 7 — Download the project

This copies the project from GitHub onto your computer.

In the terminal, paste this and press Enter:

```bash
git clone https://github.com/renatocastelo-smb/welli-onboard-agent.git
```

Then navigate into the project folder:

```bash
cd welli-onboard-agent
```

Your terminal is now "inside" the project. All future commands go from here.

---

## Step 8 — Add the API key

The API key is the password that lets the app talk to Claude AI.
Renato will send this to you privately via Google Chat.

You need to create a file called `.env.local` in the project folder.

**On Mac**, paste this into the terminal (replace `PASTE_KEY_HERE` with the key Renato sent you):

```bash
echo "ANTHROPIC_API_KEY=PASTE_KEY_HERE" > .env.local
```

**On Windows**, paste this instead:

```bash
echo ANTHROPIC_API_KEY=PASTE_KEY_HERE > .env.local
```

> ⚠️ Never share this key publicly or commit it to GitHub. It's like a password.

---

## Step 9 — Link to the Vercel project

This connects your local copy to the live Vercel project so you can run it.

Paste this and press Enter:

```bash
vercel link
```

It will ask you a few questions. Answer them like this:

- **Set up "welli-onboard-agent"?** → press `Y` then Enter
- **Which scope?** → select Renato's account (use arrow keys, then Enter)
- **Link to existing project?** → press `Y` then Enter
- **What's the name of your existing project?** → type `welli` and press Enter

---

## Step 10 — Run the app locally

```bash
vercel dev
```

Wait a few seconds. When you see something like `Ready! Available at http://localhost:3000`, open your browser and go to:

**http://localhost:3000**

You should see Welli running. 🎉

> **Dev tip:** Tap the **W avatar in the top-left corner 5 times quickly** to reset the app
> and see the full intro flow from the beginning.

---

## You're set up. Now how do you actually contribute?

### Before starting any work — always pull the latest version first:

```bash
git pull origin main
```

This makes sure you have the most recent code before you start changing anything.

### Create a branch for your work:

Think of a branch as your own personal copy to work on without affecting anyone else.

```bash
git checkout -b feature/what-youre-building
```

For example:
```bash
git checkout -b feature/new-intro-slide
```

### Open Claude Code and make your changes:

```bash
claude
```

Claude Code will read the project's `CLAUDE.md` file automatically — it tells Claude everything
about how the project works, so you don't need to explain it each time.

### Save and submit your work:

When you're happy with your changes:

```bash
git add index.html api/chat.js
git commit -m "Brief description of what you changed and why"
git push origin feature/what-youre-building
```

Then go to https://github.com/renatocastelo-smb/welli-onboard-agent in your browser.
GitHub will show a yellow banner saying your branch was recently pushed — click **Compare & pull request**.
Write a short description and submit. Renato will review and merge it.

---

## Quick reference — commands you'll use every day

| What you want to do | Command |
|---|---|
| Start the app locally | `vercel dev` |
| Get the latest code | `git pull origin main` |
| Create a new branch | `git checkout -b feature/name` |
| Open Claude Code | `claude` |
| Save your changes | `git add index.html api/chat.js` |
| Write a commit message | `git commit -m "description"` |
| Upload your branch | `git push origin feature/name` |

---

## Something went wrong?

**"command not found: vercel"** — Node.js didn't install correctly. Restart your computer and try Step 3 again.

**"Permission denied"** — On Mac, add `sudo` before the command and enter your Mac password.

**"fatal: not a git repository"** — You're not in the project folder. Run `cd welli-onboard-agent` first.

**The app loads but AI doesn't respond** — Your `.env.local` file is missing or the key is wrong. Check Step 8.

Still stuck? Message Renato.
