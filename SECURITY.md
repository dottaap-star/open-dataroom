# Security policy

`open-dataroom` is a template for an authentication-gated portal that hosts confidential documents. We take vulnerability reports seriously and would rather hear about a problem than read about it.

## Reporting a vulnerability

Open a private advisory through GitHub's built-in flow: visit the **Security** tab of this repository and click **Report a vulnerability**. Anyone with a GitHub account can file one; the conversation stays private with the maintainers — no email back-and-forth, no separate account to manage.

[**→ Report a vulnerability**](../../security/advisories/new)

We aim to acknowledge reports within **7 days** and to land a fix or a documented mitigation within **30 days** for high-severity findings. We will credit reporters in the release notes unless asked not to. There is no formal bug bounty programme.

**Forking this template?** Enable Private Vulnerability Reporting on your fork: Settings → Code security and analysis → "Privately report a vulnerability" → Enable. Without it, the Report button doesn't render and would-be reporters fall back to opening a public issue (which leaks the bug).

## Scope

In scope: anything in this repository on the default branch — authentication, invite/revocation flow, RAG/chat data handling, transport-layer concerns, dependency vulnerabilities surfaced by `npm audit`.

Out of scope:
- The privacy posture of forks running on third-party LLM APIs (each fork is responsible for its own provider relationship).
- The "best-effort" PDF download protection — see [docs/security.md](docs/security.md) for the honest caveat that DevTools defeats it.
- Issues that require physical access to a logged-in admin's browser or operating system.

## Known acceptances

Documented in [docs/security.md](docs/security.md):
- The shipped CSP includes `script-src 'self' 'unsafe-inline'` (needed for Next.js hydration + toast styling). Removing `unsafe-inline` requires plumbing per-request nonces — left as a v1.1 hardening recipe.
- In-memory rate limiting becomes a no-op across Vercel's multi-instance runtime. Recommended swap to Upstash is documented.
- `AccessLog` grows unbounded by default. A TTL index is recommended for production.
- IP→city geo lookups call out to `ip-api.com` (no key, 45 req/min). Documented + swappable.
