// GET /api/send-reminders
// Called daily by Vercel Cron at 9am UTC.
// Checks every registered email, sends whichever GP step emails are due today.
const { kv }    = require('@vercel/kv');
const { Resend } = require('resend');

const WELLI_URL = 'https://welli-theta.vercel.app';

// ── GP step reminder definitions ────────────────────────────────────────────
// daysOffset is relative to launch date (negative = before, positive = after)
const STEPS = [
  {
    id: 'upload', daysOffset: -21,
    urgency: '3 weeks to launch',
    subject: co => `${co} · Time to upload your employee list`,
    headline: 'Upload your employee list',
    body: co => `Your Wellhub launch is 3 weeks away. The first thing to do is upload your eligible employee list so the platform is ready to send invitations on launch day.\n\nLog in to Wellhub for Companies → Employees → Update employees → Import from a spreadsheet.`,
    tip: 'Upload early — it takes 1–2 business days to process and gives you time to fix any errors.',
  },
  {
    id: 'invites', daysOffset: -14,
    urgency: '2 weeks to launch',
    subject: co => `${co} · Configure Smart Invites now`,
    headline: 'Turn on Smart Invites',
    body: co => `You're 2 weeks out. Smart Invites automatically send a personalised invitation to every eligible employee as soon as they're added to the platform — set it up once and it runs itself.\n\nGo to Settings → Smart Invites → configure and save.`,
    tip: 'Smart Invites is the biggest time-saver in the whole setup — don\'t skip it.',
  },
  {
    id: 'teaser', daysOffset: -13,
    urgency: '13 days to launch',
    subject: co => `${co} · Post your teaser today`,
    headline: 'Post a teaser on your internal channels',
    body: co => `A "something exciting is coming" message sent now — on Slack, Teams, your intranet, or a break-room poster — dramatically increases sign-up rates when the launch email lands.\n\nOpen Welli's Teaser Builder to generate a ready-to-post message in seconds.`,
    tip: 'Companies that post a teaser see up to 40% higher Day-1 sign-ups.',
  },
  {
    id: 'leadership', daysOffset: -7,
    urgency: '1 week to launch',
    subject: co => `${co} · Send the leadership announcement`,
    headline: 'Leadership announcement — this is the big one',
    body: co => `A message from your CEO or HR Director is the single highest-impact action in your entire launch. It tells employees this benefit is real, it\'s supported, and it\'s worth their time.\n\nOpen Welli's Announcement Builder to draft it in under 2 minutes.`,
    tip: 'Even a short 3-sentence note from leadership outperforms a polished HR-only email every time.',
  },
  {
    id: 'i2s', daysOffset: 0,
    urgency: 'Launch day 🚀',
    subject: co => `${co} · Launch day — schedule the Kick-off email`,
    headline: 'Today is launch day — schedule your Kick-off email',
    body: co => `The Kick-off email (I2S) is the invitation that lands in every employee\'s inbox with their personal Magic Link to activate Wellhub. Schedule it now so it goes out automatically.\n\nWellhub for Companies → Employees → Update employees → expand Smart Invites → set send date → click Import.`,
    tip: 'Set the send date BEFORE clicking Import — skipping it sends invitations immediately, which may not be what you want.',
  },
  {
    id: 'webinar', daysOffset: 7,
    urgency: '1 week post-launch',
    subject: co => `${co} · Book the Welcome Webinar`,
    headline: 'Book the Welcome Webinar for your team',
    body: co => `The Welcome Webinar is a free 30-minute session run by Wellhub that walks your employees through how to make the most of their benefit. It\'s one of the best drivers of activation in the first month.\n\nAsk Welli how to book it — your CS rep or Welli can connect you with the scheduling link.`,
    tip: 'Promote it on your internal channels with a calendar invite — treat it like a company event.',
  },
  {
    id: 'comms', daysOffset: 30,
    urgency: '1 month post-launch',
    subject: co => `${co} · Share your first monthly comms assets`,
    headline: 'Time to share your monthly Wellhub content',
    body: co => `It\'s been a month since launch — now the real engagement work begins. Wellhub provides ready-made monthly communication assets: emails, social posts, challenge ideas, and raffle templates.\n\nForward the monthly pack to your team and consider running a sign-up challenge or raffle to re-engage employees who haven\'t activated yet.`,
    tip: 'Companies that send at least one comms touchpoint per month see 3× higher long-term enrollment.',
  },
];

// ── Email HTML template ──────────────────────────────────────────────────────
function buildHtml({ urgency, headline, bodyText, tip, company }) {
  const paragraphs = bodyText.split('\n\n')
    .map(p => `<p style="font-size:14px;color:rgba(27,19,64,.65);line-height:1.7;margin:0 0 14px;">${p.replace(/\n/g, '<br>')}</p>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0ede4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;padding:0 16px;">

    <!-- Card -->
    <div style="background:#fff;border-radius:16px;overflow:hidden;border:1px solid #ECE0CD;box-shadow:0 4px 16px rgba(27,19,64,.06);">

      <!-- Header -->
      <div style="background:#1B1340;padding:20px 28px;display:flex;align-items:center;gap:10px;">
        <span style="font-size:18px;font-weight:700;color:#fff;letter-spacing:-.3px;">welli<span style="display:inline-block;width:5px;height:5px;background:#F2496B;border-radius:50%;margin-left:1px;vertical-align:middle;margin-bottom:2px;"></span></span>
        <span style="font-size:11px;color:rgba(255,255,255,.4);font-weight:500;margin-left:2px;">Wellhub Onboarding</span>
      </div>

      <!-- Body -->
      <div style="padding:28px 28px 20px;">
        <div style="font-size:10.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#F2496B;margin-bottom:10px;">${urgency}</div>
        <h1 style="font-size:20px;font-weight:700;color:#1B1340;margin:0 0 16px;line-height:1.3;">${headline}</h1>
        ${paragraphs}

        <!-- Tip -->
        <div style="background:#FBF8EC;border-left:3px solid #F2496B;border-radius:0 8px 8px 0;padding:10px 14px;margin:4px 0 24px;">
          <span style="font-size:12px;font-weight:700;color:#1B1340;">💡 Tip: </span>
          <span style="font-size:12px;color:rgba(27,19,64,.6);line-height:1.5;">${tip}</span>
        </div>

        <!-- CTA -->
        <a href="${WELLI_URL}" style="display:inline-block;background:#F2496B;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:13px 26px;border-radius:10px;letter-spacing:-.1px;">Open Welli →</a>
      </div>

      <!-- Footer -->
      <div style="padding:16px 28px;border-top:1px solid #ECE0CD;">
        <p style="font-size:11px;color:rgba(27,19,64,.3);margin:0;line-height:1.5;">
          You're receiving this because you registered Welli reminders for <strong>${company}</strong>.<br>
          Powered by <a href="https://wellhub.com" style="color:rgba(27,19,64,.3);text-decoration:none;">Wellhub</a>
        </p>
      </div>
    </div>

  </div>
</body>
</html>`;
}

// ── Handler ──────────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  // Vercel Cron passes Authorization: Bearer <CRON_SECRET>
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get all registered emails
  const emails = await kv.smembers('reminder_emails');
  if (!emails || emails.length === 0) return res.status(200).json({ ok: true, sent: 0 });

  let sent = 0;
  const errors = [];

  for (const email of emails) {
    try {
      const data = await kv.get(`reminder:${email}`);
      if (!data) continue;

      const p = data.launchDate.split('-').map(Number);
      const launch = new Date(p[0], p[1] - 1, p[2]);

      for (const step of STEPS) {
        if (data.sent?.[step.id]) continue; // already sent

        const dueDate = new Date(launch);
        dueDate.setDate(dueDate.getDate() + step.daysOffset);
        dueDate.setHours(0, 0, 0, 0);

        if (dueDate.getTime() !== today.getTime()) continue; // not today

        const html = buildHtml({
          urgency:  step.urgency,
          headline: step.headline,
          bodyText: step.body(data.company),
          tip:      step.tip,
          company:  data.company,
        });

        await resend.emails.send({
          from:    'Welli <welli@wellhub.com>',
          to:      email,
          subject: step.subject(data.company),
          html,
        });

        // Mark step as sent
        data.sent = { ...data.sent, [step.id]: true };
        await kv.set(`reminder:${email}`, data, { ex: 90 * 24 * 3600 });
        sent++;
      }
    } catch (e) {
      errors.push({ email, error: e.message });
    }
  }

  console.log(`send-reminders: sent=${sent} errors=${errors.length}`);
  res.status(200).json({ ok: true, sent, errors });
};
