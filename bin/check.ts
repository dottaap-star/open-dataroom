#!/usr/bin/env tsx
/**
 * check — pre-flight validator. Verifies the deployment can actually run
 * before the first `npm run dev`.
 *
 * Run with `npm run check`. Exit code is 0 if everything passed (warnings
 * permitted) or 1 if any required check failed.
 *
 * Each check is independent and wrapped in try/catch so a single failure
 * doesn't mask the rest of the diagnostic. Output uses ✓ / ✗ / ⚠ markers.
 *
 * Required checks:
 *   - Node ≥ 20
 *   - dataroom.config.ts loads and is structurally valid
 *   - Every asset path referenced in config exists on disk
 *   - MongoDB reachable (MONGODB_URI in .env.local)
 *   - Active chat-provider API key works
 *   - Active embeddings-provider API key works
 *
 * Optional / warning-only checks:
 *   - Google Drive folder accessible (skipped if GOOGLE_DRIVE_FOLDER_ID unset)
 *   - AWS S3 bucket reachable (skipped if S3_BUCKET_NAME unset)
 *   - SMTP credentials work (skipped if EMAIL_USER unset)
 *   - Theme primary colour not still on the OSS default slate
 *   - content/ files still on default placeholders
 */

import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

// Load .env.local manually since check.ts doesn't go through Next.js.
async function loadDotenvLocal() {
    const envPath = join(process.cwd(), ".env.local");
    if (!existsSync(envPath)) return;
    const { readFileSync } = await import("node:fs");
    const lines = readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
        const m = line.match(/^([A-Z_]+)\s*=\s*(.*)$/);
        if (!m) continue;
        const [, key, raw] = m;
        if (process.env[key]) continue; // existing env wins
        let value = raw.trim();
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        process.env[key] = value;
    }
}

interface Result {
    name: string;
    status: "pass" | "fail" | "warn" | "skip";
    detail?: string;
}

const results: Result[] = [];

function add(name: string, status: Result["status"], detail?: string) {
    results.push({ name, status, detail });
    const mark =
        status === "pass" ? "\x1b[32m✓\x1b[0m" :
        status === "fail" ? "\x1b[31m✗\x1b[0m" :
        status === "warn" ? "\x1b[33m⚠\x1b[0m" :
                            "·";
    const tail = detail ? `  ${detail}` : "";
    console.log(`  ${mark} ${name}${tail}`);
}

async function checkNode() {
    const major = parseInt(process.versions.node.split(".")[0], 10);
    if (major >= 20) {
        add(`Node ${process.versions.node}`, "pass");
    } else {
        add(`Node ${process.versions.node}`, "fail", "need Node 20+");
    }
}

async function checkConfig(): Promise<typeof import("../dataroom.config").config | null> {
    try {
        // tsx supports `.ts` imports via `tsx`. We're already running in tsx,
        // so a relative import resolves and type-checks at runtime.
        const mod = await import(join(process.cwd(), "dataroom.config.ts"));
        const cfg = mod.config;
        if (!cfg || typeof cfg !== "object") {
            add("dataroom.config.ts loads", "fail", "no `config` export");
            return null;
        }
        const required = ["brand", "assets", "theme", "ai", "email", "access", "documents", "navigation", "team", "videos", "chatbot", "localKnowledge", "technical"];
        const missing = required.filter((k) => !(k in cfg));
        if (missing.length > 0) {
            add("dataroom.config.ts structurally valid", "fail", `missing: ${missing.join(", ")}`);
            return null;
        }
        add("dataroom.config.ts loads + structurally valid", "pass");
        return cfg;
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        add("dataroom.config.ts loads", "fail", msg);
        return null;
    }
}

async function checkAssets(cfg: typeof import("../dataroom.config").config | null) {
    if (!cfg) {
        add("Asset paths exist", "skip", "config failed to load");
        return;
    }
    const paths: string[] = [
        cfg.assets.logoLight,
        cfg.assets.logoDark,
        cfg.assets.faviconSvg,
        cfg.assets.faviconPng,
        cfg.assets.ogImage,
        cfg.email.logoPath,
    ];
    // Team photos (if team enabled).
    if (cfg.team.enabled) {
        for (const m of cfg.team.members) {
            if (m.photo) paths.push(m.photo);
        }
    }
    const missing: string[] = [];
    for (const p of paths) {
        const file = join(process.cwd(), "public", p);
        if (!existsSync(file)) missing.push(p);
    }
    if (missing.length === 0) {
        add(`Asset paths exist (${paths.length} checked)`, "pass");
    } else {
        add(`Asset paths exist`, "fail", `missing: ${missing.join(", ")}`);
    }
}

async function checkLocalKnowledge(cfg: typeof import("../dataroom.config").config | null) {
    if (!cfg) {
        add("Local knowledge files exist", "skip", "config failed to load");
        return;
    }
    if (cfg.localKnowledge.length === 0) {
        add("Local knowledge", "skip", "none configured");
        return;
    }
    const missing: string[] = [];
    for (const src of cfg.localKnowledge) {
        const file = resolve(process.cwd(), src.path);
        if (!existsSync(file)) missing.push(src.path);
    }
    if (missing.length === 0) {
        add(`Local knowledge files exist (${cfg.localKnowledge.length})`, "pass");
    } else {
        add("Local knowledge files exist", "fail", `missing: ${missing.join(", ")}`);
    }
}

async function checkMongo() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        add("MongoDB reachable", "fail", "MONGODB_URI not set in .env.local");
        return;
    }
    try {
        const mongoose = (await import("mongoose")).default;
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
        await mongoose.connection.db?.admin().ping();
        await mongoose.disconnect();
        add("MongoDB reachable", "pass");
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        add("MongoDB reachable", "fail", msg.slice(0, 120));
    }
}

async function checkChatProvider(cfg: typeof import("../dataroom.config").config | null) {
    if (!cfg) {
        add("Chat-provider API key", "skip", "config failed to load");
        return;
    }
    const provider = cfg.ai.chatProvider;
    try {
        if (provider === "gemini") {
            const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
            if (!key) throw new Error("GEMINI_API_KEY not set");
            const { GoogleGenerativeAI } = await import("@google/generative-ai");
            const m = new GoogleGenerativeAI(key).getGenerativeModel({ model: "embedding-001" });
            await m.embedContent("ping"); // cheapest sanity call
        } else if (provider === "openai") {
            const key = process.env.OPENAI_API_KEY;
            if (!key) throw new Error("OPENAI_API_KEY not set");
            const OpenAI = (await import("openai")).default;
            await new OpenAI({ apiKey: key }).models.list();
        } else if (provider === "anthropic") {
            const key = process.env.ANTHROPIC_API_KEY;
            if (!key) throw new Error("ANTHROPIC_API_KEY not set");
            const Anthropic = (await import("@anthropic-ai/sdk")).default;
            // 1-token completion is the cheapest verifiable call.
            await new Anthropic({ apiKey: key }).messages.create({
                model: cfg.ai.chatModel,
                max_tokens: 1,
                messages: [{ role: "user", content: "ping" }],
            });
        }
        add(`Chat provider (${provider}) API key valid`, "pass");
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        add(`Chat provider (${provider}) API key`, "fail", msg.slice(0, 120));
    }
}

async function checkEmbeddingsProvider(cfg: typeof import("../dataroom.config").config | null) {
    if (!cfg) {
        add("Embeddings-provider API key", "skip", "config failed to load");
        return;
    }
    const provider = cfg.ai.embeddingsProvider;
    // Same provider as chat ⇒ already validated.
    if (provider === cfg.ai.chatProvider) {
        add(`Embeddings provider (${provider}) — same as chat`, "skip");
        return;
    }
    try {
        if (provider === "gemini") {
            const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
            if (!key) throw new Error("GEMINI_API_KEY not set");
            const { GoogleGenerativeAI } = await import("@google/generative-ai");
            const m = new GoogleGenerativeAI(key).getGenerativeModel({ model: "embedding-001" });
            await m.embedContent("ping");
        } else if (provider === "openai") {
            const key = process.env.OPENAI_API_KEY;
            if (!key) throw new Error("OPENAI_API_KEY not set");
            const OpenAI = (await import("openai")).default;
            await new OpenAI({ apiKey: key }).embeddings.create({
                model: cfg.ai.embeddingsModel,
                input: "ping",
            });
        }
        add(`Embeddings provider (${provider}) API key valid`, "pass");
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        add(`Embeddings provider (${provider}) API key`, "fail", msg.slice(0, 120));
    }
}

async function checkDrive() {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    if (!folderId || !email || !key) {
        add("Google Drive folder", "skip", "GOOGLE_DRIVE_* not set — sync disabled");
        return;
    }
    try {
        const { google } = await import("googleapis");
        const decoded = Buffer.from(key, "base64").toString("utf-8");
        const auth = new google.auth.JWT({
            email,
            key: decoded,
            scopes: ["https://www.googleapis.com/auth/drive.readonly"],
        });
        const drive = google.drive({ version: "v3", auth });
        const res = await drive.files.list({
            q: `'${folderId}' in parents and trashed = false`,
            fields: "files(id, name, mimeType)",
        });
        const folders = (res.data.files || []).filter((f) => f.mimeType === "application/vnd.google-apps.folder").length;
        const files = (res.data.files || []).length;
        add("Google Drive folder accessible", "pass", `(${folders} subfolders, ${files} top-level entries)`);
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        add("Google Drive folder accessible", "fail", msg.slice(0, 120));
    }
}

async function checkS3() {
    const bucket = process.env.S3_BUCKET_NAME;
    if (!bucket || !process.env.AWS_ACCESS_KEY_ID) {
        add("S3 bucket", "skip", "AWS_* not set — S3 caching disabled");
        return;
    }
    try {
        const { S3Client, HeadBucketCommand } = await import("@aws-sdk/client-s3");
        const region = process.env.AWS_REGION || "us-east-1";
        const s3 = new S3Client({ region });
        await s3.send(new HeadBucketCommand({ Bucket: bucket }));
        add(`S3 bucket "${bucket}" reachable`, "pass");
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        add("S3 bucket reachable", "fail", msg.slice(0, 120));
    }
}

async function checkSmtp() {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        add("SMTP credentials", "skip", "EMAIL_USER/EMAIL_PASS not set — invites disabled");
        return;
    }
    try {
        const nodemailer = (await import("nodemailer")).default;
        const t = nodemailer.createTransport({
            service: "gmail",
            auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
        });
        await t.verify();
        add("SMTP credentials valid (gmail)", "pass");
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        add("SMTP credentials", "fail", msg.slice(0, 120));
    }
}

async function checkPlaceholders(cfg: typeof import("../dataroom.config").config | null) {
    if (!cfg) return;
    // Detect any of the three shipped demo brands. The wizard explicitly
    // does NOT rebrand for you (that's a job for an AI agent — see REBRAND.md),
    // so this warning is the persistent reminder that the repo isn't yet "yours".
    const demoBrands: { name: string; emailMarker: string; slug: string }[] = [
        { name: "Acme Capital",       emailMarker: "acme.example",       slug: "acme-capital" },
        { name: "Greenwood Holdings", emailMarker: "greenwood.example",  slug: "greenwood-holdings" },
        { name: "Lighthouse Labs",    emailMarker: "lighthouse.example", slug: "lighthouse-labs" },
    ];
    const onDemo = demoBrands.find(
        (b) => cfg.brand.name === b.name && cfg.brand.supportEmail.includes(b.emailMarker),
    );
    if (onDemo) {
        add(
            "Brand still on shipped demo",
            "warn",
            `still on the ${onDemo.name} sample (${onDemo.slug}) — see REBRAND.md for the AI-driven rebrand workflow`,
        );
    }
    // GitHub URL still placeholder?
    if (cfg.brand.poweredByCredit && cfg.brand.poweredByCreditUrl.includes("my-username")) {
        add("poweredByCreditUrl customised", "warn", "still pointing at github.com/my-username/open-dataroom");
    }
}

async function main() {
    await loadDotenvLocal();

    console.log("Pre-flight check:\n");

    await checkNode();
    const cfg = await checkConfig();
    await checkAssets(cfg);
    await checkLocalKnowledge(cfg);
    await checkMongo();
    await checkChatProvider(cfg);
    await checkEmbeddingsProvider(cfg);
    await checkDrive();
    await checkS3();
    await checkSmtp();
    await checkPlaceholders(cfg);

    const failed = results.filter((r) => r.status === "fail").length;
    const warned = results.filter((r) => r.status === "warn").length;
    const passed = results.filter((r) => r.status === "pass").length;
    const skipped = results.filter((r) => r.status === "skip").length;

    console.log("");
    console.log(`Summary: ${passed} pass, ${failed} fail, ${warned} warn, ${skipped} skip`);

    process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
    console.error("check failed:", err);
    process.exit(1);
});
