# Deploy

The first-class deploy target is Vercel. The template is a stock Next.js 16 App Router app, so anywhere that runs Next will work — but the cron, the edge middleware, and the bundled tracing config assume Vercel. Self-hosted notes below.

## Quickstart (Vercel)

Assumes you've already run `npm run setup` and `npm run check` shows green locally.

1. **Push to GitHub.** A fresh repo with the contents of this directory. Don't push `.env.local`.

2. **Connect the repo to Vercel.** Project settings:
   - Framework preset: Next.js (auto-detected)
   - Build command: `npm run build` (auto)
   - Output directory: `.next` (auto)
   - Install command: `npm install` (auto)
   - Node version: 20.x or newer

3. **Copy environment variables.** Use Vercel's project settings → Environment Variables. Bulk-paste from `.env.local` (Vercel accepts dotenv format).
   - Mark all of them as **Encrypted** (the default).
   - Apply to **Production**, **Preview**, and **Development** as you need.
   - The wizard's auto-generated `JWT_SECRET` and `CRON_SECRET` must move over verbatim.

4. **Deploy.** Vercel does the rest. First build takes ~90 seconds.

5. **Add the custom domain.** `investors.example.com` is the convention. Add a CNAME at your DNS provider per Vercel's instructions, wait for the cert.

6. **Verify cron.** Go to Vercel → Cron Jobs and confirm `/api/cron/sync` is listed with the schedule from `vercel.json`. Trigger it manually once to confirm it succeeds — the response body will tell you how many documents were synced.

7. **Send yourself a real invite.** From `/admin/invites`, invite your own email. Click the link, sign up, log in to `/portal`, send a chat message. If all three work, you're live.

8. **Rotate the admin password.** The wizard-generated one was printed once and should not be the production secret.

## Mongo Atlas

The template uses Mongo via Mongoose. Atlas free tier (M0) works for development and small production loads.

**Atlas free-tier suspension.** M0 clusters get suspended after ~60 days of inactivity. Two options:
- Upgrade to M2 ($9/mo) for production. Worth it for the backups alone.
- OR add a Vercel Cron keep-alive ping that hits `/api/admin/dashboard` daily. Cheap hack; works fine for low-traffic deployments.

**Free-tier backups don't exist.** M0 has no point-in-time recovery and no scheduled snapshots. If you stay on M0, set up a nightly `mongodump` cron yourself (a tiny VM or a GitHub Action will do).

**IP allowlisting.** Atlas requires either an IP allowlist or VPC peering. For Vercel, allowlist `0.0.0.0/0` (Vercel's serverless functions don't have stable IPs). This sounds scary but is acceptable IF your Atlas user/password and `JWT_SECRET` are strong — the connection still requires authentication. Better posture is paid Vercel + dedicated IP, or Atlas private endpoints.

**Database name** comes from the path component of `MONGODB_URI`. The wizard uses `dataroom` by default; change it before production if you care.

## SMTP / email

The default setup uses Gmail SMTP via `nodemailer`. Fine for development and small deployments; not fine for scale.

**Gmail app password requires 2FA.** Set up 2-Step Verification on the Google account first, then generate an app password at https://myaccount.google.com/apppasswords. Use the 16-char string as `EMAIL_PASS`. The wizard doesn't do this for you.

**Gmail rate limits:**
- Free Gmail: 500 messages/day, 100 recipients/message.
- Workspace: 2,000 messages/day.
- Hit the limit and you get a 24-hour cool-off, not a permanent block.

**Reputation issues.** A new Gmail account sending invite emails to investor inboxes risks landing in spam — investor mail is exactly the kind of unsolicited-feeling email spam filters flag. For anything beyond a dozen investors, swap to a transactional ESP: SendGrid, Postmark, Resend, Mailgun. All four have nodemailer-compatible SMTP credentials, so the swap is just env-var changes.

**Outgoing from address.** Comes from `EMAIL_USER` env var. The display name comes from `config.email.fromName`. Make sure they match what your DNS SPF/DKIM records allow.

## Free-tier ceilings to watch

Vercel:
- **Hobby tier:** 100 GB/month bandwidth, 100 GB-hours serverless compute. A data room with a handful of active investors viewing documents (especially video) eats this surprisingly fast. Pro is $20/mo.
- **Hobby tier:** 1 concurrent build, 4096 MB max function memory, 10-second function timeout. The 10-second timeout is the realistic constraint for `/api/admin/sync` once your Drive has more than ~50 documents. Move to Pro for 60-second timeouts.

Gemini / OpenAI / Anthropic:
- All three have rate limits below the obvious user-facing concern. A single investor with an itchy reload finger can hit Gemini's per-minute embeddings limit on a re-index. Use the recommended model defaults from the wizard; bump tier in the provider console if you see 429s in logs.

Google Drive API:
- Default quota is 1,000 read requests per 100 seconds per service account. Plenty for hourly syncs of a few hundred documents. If you cross it, request a quota bump in the GCP console (usually granted within 24 hours).

## Data residency

For EU forkers (and increasingly Canadian and Singaporean ones), data residency matters:

- **Mongo Atlas:** Pick a region in the EU (Frankfurt: `eu-central-1`, Dublin: `eu-west-1`). Free tier supports both.
- **S3:** Match your Mongo region. Cross-region traffic costs and adds latency.
- **Vercel:** Edge runtime is global by default, but you can pin function regions in `vercel.json` (`{ "regions": ["fra1"] }`).
- **LLM provider:**
  - **Anthropic via AWS Bedrock** in `eu-central-1` gives you an EU-resident inference path. Use the Bedrock SDK rather than the native Anthropic SDK if this matters; you'll need to swap `src/lib/llm/anthropic.ts`.
  - **Gemini** has regional endpoints (e.g. `europe-west4-aiplatform.googleapis.com`); the SDK accepts a region override.
  - **OpenAI** has EU data residency on enterprise plans only as of late 2025.
- **ip-api.com** is US-hosted. If EU IPs leaking to a US service offends your DPO, remove the geo lookup or swap for an EU provider.

## Backup and recovery

What needs backing up:

- **Mongo** (everything: users, invites, documents, knowledge chunks, access logs, sync history). See Atlas notes above.
- **Drive** — Google's responsibility for the originals. Drive trash retains for 30 days. Anything you `Empty Trash` is gone.
- **S3** (if used) — enable versioning + a lifecycle policy.
- **The repo** — GitHub itself is your backup. Tag releases.
- **The Vercel project** — config lives in `vercel.json` (in repo) plus env vars (in Vercel). Export env vars periodically.

What you cannot back up:

- **The bcrypt'd password hashes** — you can back up the DB row, but if a user forgets their password they go through reset; you don't restore the plaintext.
- **The wizard-generated `JWT_SECRET`** — if you lose it, every issued session invalidates simultaneously and every user has to re-login. Not catastrophic, but annoying. Don't lose it.

## Before your first public push (forks open-sourcing this template)

If you're forking this repo to a public GitHub URL **from a workstation that has run the app locally**, treat every credential in `.env.local` as compromised before you push public — `.env.local` is gitignored, but the values existed on a workstation about to mirror substantial code to a public history, and the conservative posture is to rotate.

Rotate, in this order:

1. **`MONGODB_URI` Atlas user password** — Atlas → Security → Database Access → edit user → autogenerate. Update your deployment's env. Test `/api/admin/dashboard`.
2. **`JWT_SECRET`** — `openssl rand -base64 32`. Be aware: every active session invalidates simultaneously and everyone re-logs in once. Schedule for low traffic.
3. **`CRON_SECRET`** — `openssl rand -base64 24`. Vercel's cron reads it on next invocation.
4. **`ADMIN_PASSWORD`** — pick a new one or remove the env entirely (the seed is a no-op once a User row with `isAdmin: true` exists).
5. **LLM provider key** (`GEMINI_API_KEY` / `OPENAI_API_KEY` / `ANTHROPIC_API_KEY`) — regenerate at the provider console. **Revoke the old key explicitly**, don't just rotate.
6. **`GOOGLE_SERVICE_ACCOUNT_KEY`** — GCP → IAM → Service Accounts → Keys → revoke old → generate new JSON → base64-encode the `private_key`.
7. **`EMAIL_PASS` (Gmail app password)** — Google Account → Security → 2-Step Verification → App passwords → revoke old → generate new.
8. **AWS S3 keys** (if used) — new key pair → switch deployment to new keys → after 24h, delete old.

After each rotation, run `npm run check` against your live deployment to verify nothing broke. Common foot-gun: forgetting to base64-encode the new GCP private key.

Then push public:

```bash
gh repo edit YOUR-USER/open-dataroom --visibility public --accept-visibility-change-consequences
```

And set the social preview image: Settings → General → Social preview → upload `public/assets/branding/og.png` (no `gh` API for this; UI only).

## Post-launch operational checklist

Weekly:

- Skim Vercel logs for 5xx clusters.
- Check Atlas → Metrics for query slowdowns. (Slow queries usually mean a missing index on a new field.)
- Check Vercel cron history — sync should have run on schedule with `status: success`.

Monthly:

- Review `AccessLog` for unusual patterns (failed login spikes, unexpected admin actions).
- Verify Drive folder structure still matches `tier.id` slugs in config.
- Confirm `LICENSE`, `SECURITY.md`, and any policy pages are still current.

Quarterly:

- Rotate `JWT_SECRET` (and accept the universal-logout). Belt-and-braces.
- Re-run `npm audit fix`. Bump Next.js minor version if a new one shipped.
- Review tier membership: any inactive investors? Revoke them. Less attack surface.

## The Next 16 → 17 deprecation warning

Every `npm run build` emits:

```
Warning: The "middleware" file convention is deprecated. Please use "proxy" instead.
```

Cosmetic today (the convention still works in Next 16). Real in Next 17. The migration is a file rename (`src/middleware.ts` → `src/proxy.ts`) plus a small handler signature change. Left for the v1.1 maintenance window unless Next 17 ships first. Forkers seeing the warning on first build should not be alarmed.

## Self-hosted / non-Vercel

The template is a stock Next 16 app. `npm run build && npm run start` works anywhere with Node 20+. The pieces that won't transfer cleanly:

- **Cron.** `/api/cron/sync` expects an authorized hit on a schedule. On Vercel it's `vercel.json`. On a VPS, use `systemd` timers or a `cron` entry with `curl -H "Authorization: Bearer $CRON_SECRET" https://your-domain/api/cron/sync`.
- **Edge middleware.** Vercel runs it on the edge runtime. Other hosts will run it on Node. Both work; the only consequence is slightly higher cold-start latency on non-edge hosts.
- **`outputFileTracingIncludes`** in `next.config.ts` traces specific assets into the serverless bundle. On non-serverless hosts the whole repo is on disk so this is a no-op.

**Docker.** We don't ship a Dockerfile. A 20-line `node:20-alpine` Dockerfile works fine; check PRs for community contributions if you don't want to write your own.
