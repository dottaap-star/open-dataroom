import type { Metadata, Viewport } from "next";
import { Inter, IBM_Plex_Serif } from "next/font/google";
import { RouteProvider } from "@/providers/router-provider";
import { Theme } from "@/providers/theme";
import { Toaster } from "sonner";
import { config } from "@/config";
import "@/styles/globals.css";
import { cx } from "@/utils/cx";

const inter = Inter({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-inter",
});

const plexSerif = IBM_Plex_Serif({
    subsets: ["latin"],
    weight: ["500", "600", "700"],
    display: "swap",
    variable: "--font-plex-serif",
});

const portalName = `${config.brand.name} — Investor Data Room`;

export const metadata: Metadata = {
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || config.brand.domain),
    title: {
        default: portalName,
        template: `%s | ${portalName}`,
    },
    description: `Secure data room for ${config.brand.name}. Access business documents, financials, and speak with our AI assistant.`,
    icons: {
        icon: [
            { url: config.assets.faviconSvg, type: "image/svg+xml" },
            { url: config.assets.faviconPng, type: "image/png", sizes: "32x32" },
        ],
    },
    robots: { index: false, follow: false },
};

export const viewport: Viewport = {
    themeColor: config.theme.primary,
    colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={cx(inter.variable, plexSerif.variable, "bg-paper-cream antialiased")}>
                <RouteProvider>
                    <Theme>
                        {children}
                        <Toaster position="top-right" richColors />
                    </Theme>
                </RouteProvider>
            </body>
        </html>
    );
}
