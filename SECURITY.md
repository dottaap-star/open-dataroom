# Security policy

`open-dataroom` is a template for an authentication-gated portal that hosts confidential documents. We take vulnerability reports seriously and would rather hear about a problem than read about it.

## Reporting a vulnerability

Please email **security@example.com** (or whatever address you wire your fork to) with a description of the issue, a proof of concept where possible, and the affected commit SHA. Do **not** open a public GitHub issue for security reports.

We aim to acknowledge reports within **7 days** and to land a fix or a documented mitigation within **30 days** for high-severity findings. We will credit reporters in the release notes unless asked not to. There is no formal bug bounty programme.

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
