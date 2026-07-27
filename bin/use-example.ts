#!/usr/bin/env tsx
/**
 * use-example — swap a worked example dataset into the repo root.
 *
 * Usage: `npm run example:<slug>` (e.g. `npm run example:acme-capital`).
 * Each script entry shells this script with the slug as the first arg.
 *
 * What it copies (DESTRUCTIVE — overwrites anything at the destination):
 *   - examples/<slug>/dataroom.config.ts → ./dataroom.config.ts
 *     (the import path `../../src/lib/config-types` gets rewritten to
 *      `./src/lib/config-types` to match the new file location)
 *   - examples/<slug>/theme-brand.css         → ./src/styles/theme-brand.css
 *     (the colour ramp — without this swap, brand colours don't change)
 *   - examples/<slug>/content/                → ./content/
 *     (existing .md files in content/ are removed first; README.md is preserved)
 *   - examples/<slug>/public/assets/branding/ → ./public/assets/branding/
 *   - examples/<slug>/public/assets/team/     → ./public/assets/team/ (if present)
 *
 * What it does NOT touch: src/ (except theme-brand.css), node_modules/, .env.local,
 * the rest of public/.
 *
 * Prompts for confirmation before overwriting (unless --yes is passed).
 */

import { existsSync, mkdirSync, readdirSync, copyFileSync, readFileSync, writeFileSync, statSync, unlinkSync } from "node:fs";
import { join, resolve, basename } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const REPO_ROOT = resolve(process.cwd());
const EXAMPLES_DIR = join(REPO_ROOT, "examples");

function listExamples(): string[] {
    if (!existsSync(EXAMPLES_DIR)) return [];
    return readdirSync(EXAMPLES_DIR).filter((d) => {
        try {
            return statSync(join(EXAMPLES_DIR, d)).isDirectory();
        } catch {
            return false;
        }
    });
}

async function confirm(message: string): Promise<boolean> {
    if (process.argv.includes("--yes") || process.argv.includes("-y")) return true;
    const rl = createInterface({ input, output });
    try {
        const answer = await rl.question(`${message} [y/N] `);
        return answer.trim().toLowerCase().startsWith("y");
    } finally {
        rl.close();
    }
}

function copyDir(src: string, dest: string, skipNames: Set<string> = new Set()) {
    if (!existsSync(src)) return 0;
    mkdirSync(dest, { recursive: true });
    let count = 0;
    for (const entry of readdirSync(src)) {
        if (skipNames.has(entry)) continue;
        const srcPath = join(src, entry);
        const destPath = join(dest, entry);
        if (statSync(srcPath).isDirectory()) {
            count += copyDir(srcPath, destPath, skipNames);
        } else {
            copyFileSync(srcPath, destPath);
            count++;
        }
    }
    return count;
}

function cleanContentDir(contentDir: string) {
    if (!existsSync(contentDir)) return;
    for (const entry of readdirSync(contentDir)) {
        // Preserve README.md (it explains the directory convention to forkers).
        if (entry === "README.md") continue;
        const path = join(contentDir, entry);
        if (statSync(path).isFile() && entry.endsWith(".md")) {
            unlinkSync(path);
        }
    }
}

function rewriteConfigImport(srcConfig: string, destConfig: string) {
    const text = readFileSync(srcConfig, "utf-8");
    // examples/<slug>/dataroom.config.ts → ../../src/lib/config-types
    // root      dataroom.config.ts → ./src/lib/config-types
    const rewritten = text.replace(
        /from\s+["']\.\.\/\.\.\/src\/lib\/config-types["']/g,
        'from "./src/lib/config-types"',
    );
    writeFileSync(destConfig, rewritten);
}

async function main() {
    const slug = process.argv[2];

    if (!slug || slug.startsWith("--")) {
        const examples = listExamples();
        console.error("Usage: tsx bin/use-example.ts <slug> [--yes]");
        if (examples.length > 0) {
            console.error(`Available examples: ${examples.join(", ")}`);
        }
        process.exit(1);
    }

    const exampleRoot = join(EXAMPLES_DIR, slug);
    if (!existsSync(exampleRoot) || !statSync(exampleRoot).isDirectory()) {
        const examples = listExamples();
        console.error(`Unknown example "${slug}".`);
        console.error(`Available: ${examples.length > 0 ? examples.join(", ") : "(none)"}`);
        process.exit(1);
    }

    const srcConfig    = join(exampleRoot, "dataroom.config.ts");
    const srcTheme     = join(exampleRoot, "theme-brand.css");
    const srcContent   = join(exampleRoot, "content");
    const srcBranding  = join(exampleRoot, "public", "assets", "branding");
    const srcTeam      = join(exampleRoot, "public", "assets", "team");

    if (!existsSync(srcConfig)) {
        console.error(`Example "${slug}" is incomplete: missing dataroom.config.ts`);
        process.exit(1);
    }

    const destConfig   = join(REPO_ROOT, "dataroom.config.ts");
    const destTheme    = join(REPO_ROOT, "src", "styles", "theme-brand.css");
    const destContent  = join(REPO_ROOT, "content");
    const destBranding = join(REPO_ROOT, "public", "assets", "branding");
    const destTeam     = join(REPO_ROOT, "public", "assets", "team");

    console.log(`\nThis will overwrite (existing content at the destinations will be replaced):`);
    console.log(`  - dataroom.config.ts`);
    if (existsSync(srcTheme)) console.log(`  - src/styles/theme-brand.css (brand colour ramp)`);
    console.log(`  - content/*.md (README.md is preserved)`);
    console.log(`  - public/assets/branding/*`);
    if (existsSync(srcTeam)) console.log(`  - public/assets/team/*`);
    console.log("");

    const ok = await confirm(`Apply example "${slug}"?`);
    if (!ok) {
        console.log("Aborted.");
        process.exit(0);
    }

    // 1. Config (with import path rewrite)
    rewriteConfigImport(srcConfig, destConfig);
    console.log(`✓ Wrote dataroom.config.ts`);

    // 1b. Brand colour ramp (optional — examples that don't ship one keep
    //     the previous theme; warn so the operator notices the mismatch).
    if (existsSync(srcTheme)) {
        copyFileSync(srcTheme, destTheme);
        console.log(`✓ Wrote src/styles/theme-brand.css`);
    } else {
        console.log(`⚠ Example does not ship theme-brand.css — colours will keep the previous theme`);
    }

    // 2. Content
    cleanContentDir(destContent);
    const contentCount = copyDir(srcContent, destContent);
    console.log(`✓ Wrote ${contentCount} file(s) to content/`);

    // 3. Branding
    const brandingCount = copyDir(srcBranding, destBranding);
    console.log(`✓ Wrote ${brandingCount} file(s) to public/assets/branding/`);

    // 4. Team (optional)
    if (existsSync(srcTeam)) {
        mkdirSync(destTeam, { recursive: true });
        const teamCount = copyDir(srcTeam, destTeam);
        console.log(`✓ Wrote ${teamCount} file(s) to public/assets/team/`);
    }

    console.log(`\nDone. Try:`);
    console.log(`  npm run dev`);
    console.log(`  → http://localhost:3000\n`);

    // Sanity hint: the example's config picks a provider; remind the user.
    try {
        const cfgText = readFileSync(destConfig, "utf-8");
        const chatProvider = cfgText.match(/chatProvider:\s*"([^"]+)"/)?.[1];
        const embeddingsProvider = cfgText.match(/embeddingsProvider:\s*"([^"]+)"/)?.[1];
        if (chatProvider || embeddingsProvider) {
            console.log("API keys this example expects in .env.local:");
            if (chatProvider === "gemini" || embeddingsProvider === "gemini")    console.log("  GOOGLE_GEMINI_API_KEY");
            if (chatProvider === "openai" || embeddingsProvider === "openai")    console.log("  OPENAI_API_KEY");
            if (chatProvider === "anthropic")                                    console.log("  ANTHROPIC_API_KEY");
            console.log("");
        }
    } catch {
        // best-effort hint; ignore parse failure
    }
}

main().catch((err) => {
    console.error("use-example failed:", err);
    process.exit(1);
});
