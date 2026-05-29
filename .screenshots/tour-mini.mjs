import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const EMAIL = "admin@example.com";
const PASSWORD = "demo-tour-quick-2026";
const tag = process.argv[2] || "tour";   // filename prefix

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });

const auth = await ctx.request.post(`${BASE}/api/auth/login`, {
  data: { email: EMAIL, password: PASSWORD },
});
console.log("login →", auth.status());

const pages = [
  ["login",     "/login",     { fresh: true }],
  ["portal",    "/portal"],
  ["team",      "/portal/team"],
  ["admin",     "/admin"],
];

for (const [name, path, opts = {}] of pages) {
  const useCtx = opts.fresh ? await browser.newContext({ viewport: { width: 1440, height: 900 } }) : ctx;
  const p = await useCtx.newPage();
  try {
    await p.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 15000 });
    await p.waitForTimeout(600);
    await p.screenshot({ path: `.screenshots/${tag}-${name}.png`, fullPage: true });
    console.log(`✓ ${tag}-${name} → ${path}`);
  } catch (e) {
    console.log(`✗ ${tag}-${name}: ${e.message.split("\n")[0]}`);
  }
  if (opts.fresh) await useCtx.close();
}

await browser.close();
