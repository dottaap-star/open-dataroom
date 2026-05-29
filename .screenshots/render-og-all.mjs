import { chromium } from "playwright";
import path from "node:path";

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();

const jobs = [
  { html: "og-template.html",   out: "examples/acme-capital/public/assets/branding/og.png" },
  { html: "og-greenwood.html",  out: "examples/greenwood-holdings/public/assets/branding/og.png" },
  { html: "og-lighthouse.html", out: "examples/lighthouse-labs/public/assets/branding/og.png" },
];

for (const { html, out } of jobs) {
  await page.goto(`file://${path.resolve(".screenshots/" + html)}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 1200, height: 630 } });
  console.log(`✓ ${out}`);
}

await browser.close();
