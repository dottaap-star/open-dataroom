import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const EMAIL = "admin@example.com";
const PASSWORD = "demo-tour-quick-2026";

const pages = [
  ["01-login",            "/login",              { skipAuth: true }],
  ["02-portal-home",      "/portal"],
  ["03-portal-documents", "/portal/documents"],
  ["04-portal-team",      "/portal/team"],
  ["05-portal-videos",    "/portal/videos"],
  ["06-admin-dashboard",  "/admin"],
  ["07-admin-invites",    "/admin/invites"],
  ["08-admin-documents",  "/admin/documents"],
  ["09-admin-activity",   "/admin/activity"],
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });

// Authenticate once via the API and reuse cookies for all pages.
const apiResp = await ctx.request.post(`${BASE}/api/auth/login`, {
  data: { email: EMAIL, password: PASSWORD },
});
console.log("login →", apiResp.status());

const page = await ctx.newPage();
page.on("pageerror", e => console.log("PAGE ERROR:", e.message));
page.on("response", r => { if (r.status() >= 500) console.log("5xx:", r.url(), r.status()); });

for (const [name, path, opts = {}] of pages) {
  if (opts.skipAuth) {
    const fresh = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await fresh.newPage();
    await p.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 15000 }).catch(e => console.log(`nav fail ${path}:`, e.message));
    await p.waitForTimeout(500);
    await p.screenshot({ path: `.screenshots/${name}.png`, fullPage: true });
    console.log(`✓ ${name} → ${path}`);
    await fresh.close();
    continue;
  }
  try {
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 15000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `.screenshots/${name}.png`, fullPage: true });
    console.log(`✓ ${name} → ${path}`);
  } catch (e) {
    console.log(`✗ ${name} → ${path}:`, e.message.split("\n")[0]);
    await page.screenshot({ path: `.screenshots/${name}-ERROR.png`, fullPage: true }).catch(() => {});
  }
}

await browser.close();
console.log("done");
