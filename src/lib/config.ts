/**
 * The one import surface for everything in `src/` that needs to read the data
 * room's configuration. Consumers do:
 *
 *     import { config } from "@/config";
 *
 * and read `config.brand.name`, `config.access.tiers`, etc.
 *
 * Edge-runtime constraint (plan §12): this file is intentionally minimal — it
 * re-exports a frozen object literal and a type. It MUST NOT transitively
 * import anything that pulls in a Node-only package (mongoose, googleapis,
 * nodemailer, the LLM SDKs). The middleware runs in the edge runtime and may
 * one day need to read from config; keeping this file side-effect-free keeps
 * that door open.
 */

import { config as rawConfig } from "../../dataroom.config";
import type { DataroomConfig } from "./config-types";

/**
 * `Object.freeze` is shallow — without recursion, `config.brand.name = "..."`
 * would still mutate the live config object at runtime. The frozen contract
 * has to be deep so consumers can treat config as truly immutable.
 *
 * Strict-mode note: mutations to a frozen object throw `TypeError` under
 * strict mode (which is what Next.js + the bundler produces in production
 * code paths). Some sloppy-mode contexts (e.g. raw `tsx -e` scripts that
 * don't opt into strict) silently reject the write instead of throwing.
 * Either way, the value isn't mutated.
 */
function deepFreeze<T>(value: T): T {
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
        Object.freeze(value);
        for (const v of Object.values(value)) {
            deepFreeze(v);
        }
    }
    return value;
}

export const config: DataroomConfig = deepFreeze(rawConfig);

export type { DataroomConfig } from "./config-types";
