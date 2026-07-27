#!/usr/bin/env tsx
/**
 * setup — interactive onboarding wizard (~5 minutes, 7 steps).
 *
 * Run with `npm run setup`. This wizard's job is to produce a working
 * `.env.local`. It does NOT touch `dataroom.config.ts` — the shipped repo
 * uses the Acme Capital sample brand by default; rebrand it yourself
 * (edit `dataroom.config.ts` directly, swap in another example via
 * `npm run example:<slug>`, or ask an AI agent — see REBRAND.md).
 *
 * The wizard only handles operational plumbing:
 *   1. Deploy target + production URL (informational + 1 input)
 *   2. MongoDB connection            (mandatory, tested live)
 *   3. AI provider API key(s)        (mandatory, tested live)
 *   4. Google Drive credentials      (optional)
 *   5. AWS S3 credentials            (optional)
 *   6. Admin seed account            (mandatory)
 *   7. Gmail SMTP                    (optional, tested live)
 *
 * Plus auto-generated JWT_SECRET + CRON_SECRET if missing.
 */

import * as p from "@clack/prompts";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import crypto from "node:crypto";

const ROOT = process.cwd();
const ENV_PATH = join(ROOT, ".env.local");

function bail(message: string): never {
    p.cancel(message);
    process.exit(1);
}

function isCancel(value: unknown): boolean {
    return typeof value === "symbol";
}

async function promptText(message: string, opts: { placeholder?: string; defaultValue?: string; validate?: (v: string) => string | undefined } = {}) {
    const result = await p.text({
        message,
        placeholder: opts.placeholder,
        initialValue: opts.defaultValue,
        validate: opts.validate
            ? ((value: string | undefined) => opts.validate!(value ?? ""))
            : undefined,
    });
    if (isCancel(result)) bail("Setup cancelled.");
    return result as string;
}

async function promptSelect<T extends string>(message: string, options: { value: T; label: string; hint?: string }[]) {
    // @clack/prompts' Option<T> uses a stricter generic-variance shape than
    // what TypeScript widens our literal-options array to. The eslint-disable
    // here lets us pass the well-formed shape through without re-typing it.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await p.select({ message, options: options as any });
    if (isCancel(result)) bail("Setup cancelled.");
    return result as T;
}

async function promptConfirm(message: string, initialValue = false) {
    const result = await p.confirm({ message, initialValue });
    if (isCancel(result)) bail("Setup cancelled.");
    return result as boolean;
}

async function promptPassword(message: string) {
    const result = await p.password({ message });
    if (isCancel(result)) bail("Setup cancelled.");
    return result as string;
}

// ============================================================
// .env.local read / write
// ============================================================

function readEnv(): Map<string, string> {
    const map = new Map<string, string>();
    if (!existsSync(ENV_PATH)) return map;
    for (const line of readFileSync(ENV_PATH, "utf-8").split("\n")) {
        const m = line.match(/^([A-Z_]+)\s*=\s*(.*)$/);
        if (!m) continue;
        let value = m[2].trim();
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        map.set(m[1], value);
    }
    return map;
}

function writeEnv(map: Map<string, string>) {
    const lines: string[] = [];
    const sections: [string, string[]][] = [
        ["MongoDB",                ["MONGODB_URI", "MONGODB_DB"]],
        ["JWT",                    ["JWT_SECRET", "JWT_ACCESS_EXPIRY", "JWT_REFRESH_EXPIRY"]],
        ["Email (Gmail SMTP)",     ["EMAIL_USER", "EMAIL_PASS"]],
        ["Google Drive",           ["GOOGLE_DRIVE_FOLDER_ID", "GOOGLE_SERVICE_ACCOUNT_EMAIL", "GOOGLE_SERVICE_ACCOUNT_KEY"]],
        ["AWS S3",                 ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION", "S3_BUCKET_NAME", "CDN_URL"]],
        ["AI providers",           ["GOOGLE_GEMINI_API_KEY", "OPENAI_API_KEY", "ANTHROPIC_API_KEY"]],
        ["Admin seed",             ["ADMIN_EMAIL", "ADMIN_PASSWORD"]],
        ["App",                    ["NEXT_PUBLIC_APP_URL", "CRON_SECRET"]],
    ];
    for (const [section, keys] of sections) {
        lines.push(`# ${section}`);
        for (const k of keys) {
            const v = map.get(k);
            if (v !== undefined) lines.push(`${k}=${v}`);
        }
        lines.push("");
    }
    // Any keys not in the section list — preserve them.
    const knownKeys = new Set(sections.flatMap(([, ks]) => ks));
    const extras = [...map.entries()].filter(([k]) => !knownKeys.has(k));
    if (extras.length > 0) {
        lines.push("# Other");
        for (const [k, v] of extras) lines.push(`${k}=${v}`);
    }
    writeFileSync(ENV_PATH, lines.join("\n").trimEnd() + "\n", "utf-8");
}

// ============================================================
// Provider model defaults — used only for live connectivity probes
// ============================================================

const DEFAULT_MODELS = {
    gemini:    { chat: "gemini-3.1-pro-preview",     embed: "text-embedding-005" },
    openai:    { chat: "gpt-4o",                     embed: "text-embedding-3-small" },
    anthropic: { chat: "claude-sonnet-4-5",          embed: "" }, // forced to gemini or openai
};

// ============================================================
// Connectivity tests
// ============================================================

async function testMongo(uri: string): Promise<string | null> {
    try {
        const mongoose = (await import("mongoose")).default;
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
        await mongoose.connection.db?.admin().ping();
        await mongoose.disconnect();
        return null;
    } catch (err) {
        return err instanceof Error ? err.message.slice(0, 160) : String(err);
    }
}

async function testProviderKey(provider: "gemini" | "openai" | "anthropic", key: string, model?: string): Promise<string | null> {
    try {
        if (provider === "gemini") {
            const { GoogleGenAI } = await import("@google/genai");
            await new GoogleGenAI({ vertexai: true, apiKey: key }).models.embedContent({ model: "text-embedding-005", contents: "ping" });
        } else if (provider === "openai") {
            const OpenAI = (await import("openai")).default;
            await new OpenAI({ apiKey: key }).models.list();
        } else if (provider === "anthropic") {
            const Anthropic = (await import("@anthropic-ai/sdk")).default;
            await new Anthropic({ apiKey: key }).messages.create({
                model: model || DEFAULT_MODELS.anthropic.chat,
                max_tokens: 1,
                messages: [{ role: "user", content: "ping" }],
            });
        }
        return null;
    } catch (err) {
        return err instanceof Error ? err.message.slice(0, 160) : String(err);
    }
}

async function testSmtp(user: string, pass: string): Promise<string | null> {
    try {
        const nodemailer = (await import("nodemailer")).default;
        const t = nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
        await t.verify();
        return null;
    } catch (err) {
        return err instanceof Error ? err.message.slice(0, 160) : String(err);
    }
}

// ============================================================
// Main wizard
// ============================================================

async function main() {
    p.intro("\x1b[1mopen-dataroom setup\x1b[0m  — ~5 minutes to a running dev server");
    p.log.info(
        "Scope: this wizard writes .env.local (connections, API keys, admin seed).\n" +
        "It does NOT touch dataroom.config.ts — the repo ships with the Acme\n" +
        "Capital sample brand applied by default. See REBRAND.md when you're\n" +
        "ready to make it your own (you can paste a one-shot prompt to Claude\n" +
        "Code / Cursor and have it rebrand for you in a few minutes)."
    );

    const env = readEnv();

    // ---- Step 1: Deploy target + production URL ----
    const deployTarget = await promptSelect("[1/7] Deploy target", [
        { value: "vercel", label: "Vercel", hint: "Recommended — template ships ready for it" },
        { value: "other",  label: "Other (self-hosted / Render / Fly / Railway)" },
    ]);
    if (deployTarget === "other") {
        p.log.info("See docs/deploy.md before you push. The build is provider-agnostic; only vercel.json's cron config is Vercel-specific.");
    }
    const appUrl = await promptText("Production URL (used in emails + metadataBase; leave default for local dev)", {
        placeholder: "https://dataroom.example.com",
        defaultValue: env.get("NEXT_PUBLIC_APP_URL") || "http://localhost:3000",
        validate: (v) => /^https?:\/\/[^\s]+$/.test(v) ? undefined : "Must be a full URL (http:// or https://)",
    });
    env.set("NEXT_PUBLIC_APP_URL", appUrl);

    // ---- Step 2: MongoDB (MANDATORY) ----
    p.log.step("[2/7] MongoDB  (mandatory)");
    let mongoUri = "";
    while (true) {
        mongoUri = await promptText("Connection string (mongodb+srv://...)", {
            placeholder: "mongodb+srv://user:pass@cluster.mongodb.net",
            defaultValue: env.get("MONGODB_URI"),
        });
        const s = p.spinner();
        s.start("Testing connection...");
        const err = await testMongo(mongoUri);
        if (err === null) {
            s.stop("MongoDB OK ✓");
            break;
        }
        s.stop(`Connection failed: ${err}`);
        if (!await promptConfirm("Retry?", true)) bail("MongoDB is required — re-run setup when you have a connection string.");
    }
    env.set("MONGODB_URI", mongoUri);
    env.set("MONGODB_DB", env.get("MONGODB_DB") || "open_dataroom");

    // ---- Step 3: AI provider keys (MANDATORY) ----
    p.log.step("[3/7] AI provider keys  (mandatory)");
    p.log.info(
        "dataroom.config.ts decides which provider the chat panel uses. The shipped\n" +
        "Acme example uses OpenAI; Greenwood uses Anthropic+OpenAI; Lighthouse uses\n" +
        "Gemini. Set the key(s) for whichever provider(s) your config picks."
    );
    const chatProvider = await promptSelect("Which provider matches your dataroom.config.ts chatProvider?", [
        { value: "openai",    label: "OpenAI",    hint: "Default for the shipped Acme example" },
        { value: "gemini",    label: "Gemini",    hint: "Free tier ~30s setup at the GCP console (Vertex-bound key)" },
        { value: "anthropic", label: "Anthropic", hint: "Will also prompt for OpenAI/Gemini embeddings key" },
    ]) as "gemini" | "openai" | "anthropic";

    let embeddingsProvider: "gemini" | "openai" = chatProvider === "anthropic" ? "gemini" : (chatProvider as "gemini" | "openai");
    if (chatProvider === "anthropic") {
        embeddingsProvider = await promptSelect("Anthropic ships no embedder — which provider for vector indexing?", [
            { value: "gemini", label: "Gemini",  hint: "Free tier" },
            { value: "openai", label: "OpenAI",  hint: "Payment required" },
        ]) as "gemini" | "openai";
    }

    let chatKey = "";
    while (true) {
        chatKey = await promptPassword(`${chatProvider.toUpperCase()} API key (input hidden)`);
        if (!chatKey.trim()) {
            p.log.warn("API key required.");
            continue;
        }
        const s = p.spinner();
        s.start(`Testing ${chatProvider} key...`);
        const err = await testProviderKey(chatProvider, chatKey, DEFAULT_MODELS[chatProvider].chat);
        if (err === null) {
            s.stop(`${chatProvider} key OK ✓`);
            break;
        }
        s.stop(`Key rejected: ${err}`);
        if (!await promptConfirm("Retry?", true)) bail("Chat provider key is required.");
    }
    const envKeyName = chatProvider === "gemini" ? "GOOGLE_GEMINI_API_KEY" : chatProvider === "openai" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY";
    env.set(envKeyName, chatKey);

    if (chatProvider === "anthropic") {
        let embKey = "";
        while (true) {
            embKey = await promptPassword(`${embeddingsProvider.toUpperCase()} API key for embeddings (input hidden)`);
            if (!embKey.trim()) { p.log.warn("Required."); continue; }
            const s = p.spinner();
            s.start(`Testing ${embeddingsProvider} key...`);
            const err = await testProviderKey(embeddingsProvider, embKey);
            if (err === null) { s.stop(`${embeddingsProvider} key OK ✓`); break; }
            s.stop(`Key rejected: ${err}`);
            if (!await promptConfirm("Retry?", true)) bail("Embeddings key required when chat is Anthropic.");
        }
        env.set(embeddingsProvider === "gemini" ? "GOOGLE_GEMINI_API_KEY" : "OPENAI_API_KEY", embKey);
    }

    // ---- Step 4: Google Drive (optional) ----
    p.log.step("[4/7] Google Drive  (optional — app runs without docs)");
    const driveChoice = await promptSelect("Configure Drive now?", [
        { value: "skip",   label: "Skip — I'll add this later" },
        { value: "config", label: "Configure" },
    ]);
    if (driveChoice === "config") {
        const saEmail = await promptText("Service account email", { placeholder: "sync-bot@project.iam.gserviceaccount.com" });
        const saKey   = await promptPassword("Service account JSON (paste full JSON, will be base64-encoded; input hidden)");
        const folderId = await promptText("Drive folder ID (the long string from the folder URL)");
        env.set("GOOGLE_SERVICE_ACCOUNT_EMAIL", saEmail);
        env.set("GOOGLE_SERVICE_ACCOUNT_KEY", Buffer.from(saKey).toString("base64"));
        env.set("GOOGLE_DRIVE_FOLDER_ID", folderId);
        p.log.success("Drive credentials saved. Run `npm run check` to verify access after setup.");
    }
    // Skip path: leave GOOGLE_DRIVE_* unset so check.ts treats the deployment
    // as Drive-disabled (clean skip) rather than mid-config with TODO values.

    // ---- Step 5: AWS S3 (optional) ----
    p.log.step("[5/7] AWS S3  (optional — only used if you enable doc caching)");
    const s3Choice = await promptSelect("Configure S3 now?", [
        { value: "skip",   label: "Skip" },
        { value: "config", label: "Configure" },
    ]);
    if (s3Choice === "config") {
        env.set("AWS_ACCESS_KEY_ID",     await promptText("AWS_ACCESS_KEY_ID"));
        env.set("AWS_SECRET_ACCESS_KEY", await promptPassword("AWS_SECRET_ACCESS_KEY (hidden)"));
        env.set("AWS_REGION",            await promptText("AWS_REGION", { defaultValue: "us-east-1" }));
        env.set("S3_BUCKET_NAME",        await promptText("S3 bucket name"));
    }

    // ---- Step 6: Admin account ----
    p.log.step("[6/7] Admin account");
    const adminEmail = await promptText("Admin email", {
        placeholder: "admin@example.com",
        defaultValue: env.get("ADMIN_EMAIL") || "admin@example.com",
        validate: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? undefined : "Invalid email",
    });
    let adminPassword = await promptPassword("Admin password (empty = auto-generate)");
    let generated = false;
    if (!adminPassword.trim()) {
        adminPassword = crypto.randomBytes(12).toString("base64").replace(/[+/=]/g, "").slice(0, 16);
        generated = true;
    }
    env.set("ADMIN_EMAIL", adminEmail);
    env.set("ADMIN_PASSWORD", adminPassword);

    // ---- Step 7: Email / SMTP (optional but recommended) ----
    p.log.step("[7/7] Email  (Gmail SMTP — required for invites and password resets)");
    p.log.info("PREREQUISITE: 2-factor auth enabled, plus a Gmail app password (16 chars).\nSee https://myaccount.google.com/apppasswords");
    const emailChoice = await promptSelect("Configure now?", [
        { value: "skip",   label: "Skip — disable email until later" },
        { value: "config", label: "Configure" },
    ]);
    if (emailChoice === "config") {
        while (true) {
            const emailUser = await promptText("Gmail address", { placeholder: "you@yourdomain.com", validate: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? undefined : "Invalid email" });
            const emailPass = await promptPassword("Gmail app password (16 chars; hidden)");
            const s = p.spinner();
            s.start("Verifying SMTP...");
            const err = await testSmtp(emailUser, emailPass);
            if (err === null) {
                s.stop("SMTP OK ✓");
                env.set("EMAIL_USER", emailUser);
                env.set("EMAIL_PASS", emailPass);
                break;
            }
            s.stop(`SMTP failed: ${err}`);
            if (!await promptConfirm("Retry?", true)) {
                // No fake "TODO" values — leave the keys unset so `npm run check`
                // reports a clean skip ("SMTP credentials: EMAIL_USER/EMAIL_PASS
                // not set") rather than a confusing "Invalid login" against bad
                // strings that look like credentials.
                p.log.warn("SMTP left unconfigured. Run `npm run setup` again or add EMAIL_USER+EMAIL_PASS to .env.local manually.");
                break;
            }
        }
    }

    // ---- JWT secret + cron secret — auto-generate if absent ----
    if (!env.get("JWT_SECRET"))     env.set("JWT_SECRET",     crypto.randomBytes(32).toString("base64"));
    if (!env.get("CRON_SECRET"))    env.set("CRON_SECRET",    crypto.randomBytes(24).toString("base64"));
    env.set("JWT_ACCESS_EXPIRY",  env.get("JWT_ACCESS_EXPIRY")  || "15m");
    env.set("JWT_REFRESH_EXPIRY", env.get("JWT_REFRESH_EXPIRY") || "7d");
    // NEXT_PUBLIC_APP_URL was set in Step 1; no fallback needed here.

    writeEnv(env);

    p.outro("Setup complete.");
    console.log("");
    console.log(`File written: .env.local  (dataroom.config.ts left alone — see below)`);
    console.log("");
    console.log(`Admin login:`);
    console.log(`  email:    ${adminEmail}`);
    console.log(`  password: ${generated ? `${adminPassword}  (auto-generated; printed once — copy now)` : "(your input)"}`);
    console.log("");
    console.log(`Next:`);
    console.log(`  npm run check   # validate everything before first run`);
    console.log(`  npm run dev     # start the dev server on http://localhost:3000`);
    console.log("");
    console.log(`\x1b[33mYour repo is still on the Acme Capital sample brand.\x1b[0m`);
    console.log(`When you're ready to make it your own:`);
    console.log(`  - cat REBRAND.md                              # the AI-driven rebrand workflow`);
    console.log(`  - cat examples/acme-capital/BRAND.md          # what a complete brand looks like`);
    console.log(`  - npx tsx bin/use-example.ts greenwood-holdings --yes   # try a different demo brand`);
    console.log("");
}

main().catch((err) => {
    console.error("setup failed:", err);
    process.exit(1);
});
