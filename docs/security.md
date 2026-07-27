# Security

This document is honest about what the template defends, what it doesn't, and what you need to harden before production. Read it before you go live.

## Threat model

A small, single-tenant investor data room. Realistic adversaries:

- A logged-out attacker hitting the public surface (login, signup-via-invite, password reset).
- A logged-in investor trying to access a tier they're not assigned to.
- A revoked investor whose access token hasn't expired yet.
- A casual scraper trying to download a document they're allowed to view.
- A future operator (or auditor) reconstructing what happened from logs.

Out of scope: nation-state adversaries, side-channel attacks, supply-chain attacks against the LLM provider, social engineering of the admin, and physical access to a logged-in browser.

## Authentication

**Email + password + invite tokens.** No SSO, no magic links, no OAuth. Documented as an extension point (see [CONTRIBUTING.md](../CONTRIBUTING.md)) but not in the template.

**Passwords** are hashed with `bcryptjs` at cost 12. Plain text never reaches the DB or the logs.

**Sessions** are JWT cookies — one short-lived access token (15 min default) and one longer-lived refresh token (7 days default). Both carry `tokenVersion`; both are checked against the DB user's current `tokenVersion` on every protected request. A revoke increments the DB version, instantly invalidating every outstanding token for that user.

**Cookies** are `httpOnly`, `secure` (in production), `sameSite: "lax"`. Lax (not strict) is a deliberate choice — strict breaks the magic-link-style invite acceptance flow when the user follows an email link to the signup page.

**CSRF posture.** Lax cookies + JSON-only request handlers. The shipped routes call `request.json()` and treat malformed bodies as 400 — a classic form-encoded CSRF POST won't parse as JSON. The template does **not** ship an explicit `Origin`/`Referer` allowlist or a per-request CSRF token; a cross-origin browser request that crafts a JSON body can in principle reach the route, but the response is unreadable to the attacker (no CORS allowlist) and the cookies stay `httpOnly`. For higher-assurance deployments add an explicit Origin check (~5 lines in middleware) or a CSRF token round-trip.

**Logout** clears both cookies on the client and increments `tokenVersion` server-side, so a stolen-but-not-revoked refresh token from before logout stops working. (Without the bump, a passive attacker who'd captured the refresh token before logout would have a 7-day window.)

**Edge middleware** decodes the JWT (signature check only — no DB call) and routes to the right shell. A crafted JWT that passes signature verification reaches the API layer, where `getCurrentUser` does the DB lookup, the `isActive` check, and the `tokenVersion` reconcile — all three must pass. A forged JWT fails at the API with 401/403, never with a successful response.

## Authorization

**Tiers gate document and chat surfaces.** `/api/documents` and `/api/chat` enforce the user's `tier` against the document's `tier` (or rejects with 403 if the user has no tier in a multi-tier deployment). The admin invite POST requires a tier in multi-tier mode (the historical "silently mint a no-tier user" bug is fixed).

**Admin actions** require `isAdmin: true` on the User record. There is no role granularity beyond admin/investor.

**Direct-URL access to documents** uses signed S3 URLs (when S3 is configured) or signed Drive download links — both expire within minutes and aren't shareable.

## What the document viewer does NOT prevent

The PDF viewer disables right-click → save and the toolbar download button. **Anyone with browser DevTools can extract the PDF.** This is a fundamental limit of serving a renderable document to a browser. If you need DRM, watermarking, or true no-download enforcement, this template is the wrong starting point — you need a dedicated VDR vendor.

`docs/customize.md` mentions the convention; we restate here so it's unambiguous: the viewer is **best-effort**, not enforcement.

## CSP

The shipped Content Security Policy, copied verbatim from [`next.config.ts`](../next.config.ts):

```
default-src 'self';
script-src  'self' 'unsafe-inline';                ← see note below
style-src   'self' 'unsafe-inline';
img-src     'self' data: https:;
connect-src 'self' https://*.googleapis.com
                   https://aiplatform.googleapis.com
                   https://api.openai.com
                   https://api.anthropic.com;
frame-src   'self' https://www.youtube.com https://www.youtube-nocookie.com;
object-src  'none';
base-uri    'self';
form-action 'self';
frame-ancestors 'none';
upgrade-insecure-requests;
```

**`'unsafe-inline'` on script-src is a known permissiveness.** It's needed for Next.js's inline hydration script and Sonner toast styling. Removing it requires plumbing per-request nonces through the middleware → root layout → `next.config.ts` headers loop with `'strict-dynamic'`. Left as a v1.1 hardening recipe; forks with strict-CSP requirements can do the swap (~2 hours, mechanical).

**`connect-src` is provider-conditional.** Only the active chat + embeddings provider's API host needs to be allowlisted. If you're Gemini-only, you can drop the OpenAI and Anthropic lines. `*.googleapis.com` covers Drive and Gemini.

**`ip-api.com` is not in CSP.** The lookup is server-side (`src/lib/geo.ts` from `/api/auth/login`), so the browser CSP doesn't gate it. The egress happens regardless.

## Refresh token invalidation

Logout, password reset, and admin revoke all bump `tokenVersion`. The next request from a stale token gets 401, the client follows its refresh flow, the refresh endpoint also checks `tokenVersion`, fails, and the user is bounced to login. End-to-end the worst-case lag is the duration of an already-in-flight request.

**Concurrent-session policy.** Bumping `tokenVersion` kills every session for that user — there's no per-device session table. A user logged in on both laptop and phone will be logged out of both when revoked or when one device logs out.

## Rate limiting

The shipped rate-limit middleware is in-memory. On Vercel's serverless runtime this is effectively a no-op — each warm function instance has its own bucket, so a determined attacker spreading requests across cold starts will mostly bypass it.

**Recommended swap-to-Upstash** is a 10-line code change. Use the `@upstash/ratelimit` package, replace the in-memory `Map` in the middleware, configure `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in your environment, and you have proper distributed rate limiting. Costs about $0 at hobby usage.

## AccessLog growth

`AccessLog` records every login, document view, chat request, and admin action. With even a small user base it grows by a few thousand rows a month. The shipped schema indexes `timestamp` for query performance but has no TTL.

**Recommended:** add a Mongo TTL index on `timestamp` with whatever retention period your compliance posture allows.

```js
db.accesslogs.createIndex({ timestamp: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });  // 90 days
```

Alternatively rotate to an `AccessLogArchive` collection on a cron. Both approaches are documented; neither is shipped because there is no defensible default — the right retention is regulatory, not technical.

## IP geo lookup

`/api/auth/login` looks up the requester's IP via `ip-api.com` (free, no key, 45 req/min limit). The lookup is `await`-ed with a 3s `AbortSignal.timeout`; failure is silent (location stays null, login still succeeds). Result populates `AccessLog.country/city`.

**Privacy implication:** every login IP leaks to `ip-api.com`. For GDPR-bound deployments, swap to a paid provider whose contract aligns with your DPA, or remove the lookup entirely. The relevant code lives in [src/lib/geo.ts](../src/lib/geo.ts) and the call site is at [src/app/api/auth/login/route.ts](../src/app/api/auth/login/route.ts). Removing it is a two-line delete.

## Privacy notice for LLM data sharing

Chat messages and the retrieved document chunks go to your configured LLM provider as part of the system prompt + user message. This is fundamental to RAG-grounded chat and there is no workaround other than self-hosting an LLM.

The `chatbot.privacyNotice` field renders muted text above the chat input warning investors of this. **The default text mentions Gemini explicitly** — customise it for your provider, link to your privacy policy, and consider whether your fork needs investor consent capture (a per-session "I understand" checkbox) before the first chat send. The hook for that lives in `src/app/(portal)/portal/page.tsx`.

## GDPR self-assessment checklist

Not legal advice, but the obvious questions:

- [ ] **Delete-account endpoint.** Not shipped. Decide whether forkers need it, then build it (`DELETE /api/auth/me` + cascading wipes across User, Invite, AccessLog).
- [ ] **Data export.** Not shipped. Decide whether forkers need it, then build it (`GET /api/auth/me/export` returning a JSON dump of the user's rows).
- [ ] **Retention policy.** Pick a retention period for `AccessLog` and `SyncHistory`. Write it into your privacy policy.
- [ ] **Privacy notice.** Replace the default `chatbot.privacyNotice`. Link a real policy.
- [ ] **Lawful basis.** Document why you're storing each piece of investor data. "Legitimate interest in vetted investor relations" usually covers a data room; check with counsel.
- [ ] **DPA with your LLM provider.** Anthropic, OpenAI, and Google all offer DPAs to commercial customers. The free tiers usually don't include one — make sure your account type matches your compliance posture.

## Recommended production hardening

Beyond the defaults:

1. **Replace in-memory rate limiting with Upstash** (or any distributed store). See "Rate limiting" above.
2. **Add the AccessLog TTL index.** Pick a period and commit.
3. **Rotate ADMIN_PASSWORD** away from any wizard-generated default.
4. **Move secrets to Vercel Encrypted Environment Variables** or your equivalent — never commit `.env.local`.
5. **Enable Vercel Web Application Firewall** (or your CDN's WAF) for the obvious bot floors.
6. **Set up Mongo Atlas backups.** Free-tier clusters don't have them. Either move to a paid tier with point-in-time recovery, or schedule a nightly `mongodump` cron yourself.
7. **Audit the CSP** — relax `connect-src` to only the providers you actually use, and consider the `'strict-dynamic'` nonce swap if your security review demands no `unsafe-inline`.
8. **Set up Mongo IP allowlisting** (or VPC peering) so the cluster only accepts connections from your deploy infrastructure.
9. **Set HSTS at the CDN.** Vercel sets it automatically for custom domains with HTTPS; verify it's actually present.

## Disclosure

If you find a vulnerability, please follow [SECURITY.md](../SECURITY.md). Do not file a public issue.
