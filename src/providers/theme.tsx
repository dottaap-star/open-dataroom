"use client";

import { ThemeProvider } from "next-themes";
import { config } from "@/config";

// Per-brand localStorage key prevents stomp on shared-laptop multi-deploy scenarios.
const storageKey = `${config.brand.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-theme`;

export function Theme({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider
            attribute="class"
            value={{ light: "light" }}
            enableSystem={false}
            defaultTheme="light"
            forcedTheme="light"
            storageKey={storageKey}
        >
            {children}
        </ThemeProvider>
    );
}
