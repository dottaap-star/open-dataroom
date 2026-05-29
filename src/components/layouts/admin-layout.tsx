"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { cx } from "@/utils/cx";
import { config } from "@/config";

const ADMIN_NAV = config.navigation.admin;
// First tier id is the default "preview as investor" target. If no tiers are
// configured at all, the preview button is suppressed (the deployment has no
// notion of "viewing as a tier" — every investor sees everything).
const DEFAULT_PREVIEW_TIER = config.access.tiers[0]?.id ?? null;
const HAS_TIERS = config.access.tiers.length > 0;

export function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
    };

    return (
        <div className="flex h-screen overflow-hidden">
            {/* Sidebar */}
            <aside className="flex w-64 shrink-0 flex-col border-r border-secondary bg-primary">
                <div className="flex h-16 items-center border-b border-secondary px-6">
                    <Image src={config.assets.logoLight} alt={config.brand.name} width={100} height={32} />
                </div>

                <div className="px-3 pt-4">
                    <p className="px-3 text-xs font-semibold uppercase tracking-wider text-quaternary">Admin</p>
                </div>

                <nav className="flex-1 space-y-1 px-3 py-2">
                    {ADMIN_NAV.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cx(
                                    "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-brand-50 text-brand-700"
                                        : "text-tertiary hover:bg-secondary hover:text-primary"
                                )}
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="border-t border-secondary p-4">
                    <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-tertiary transition-colors hover:bg-secondary hover:text-primary"
                    >
                        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        Sign out
                    </button>
                </div>
            </aside>

            {/* Main */}
            <main className="flex-1 overflow-y-auto">
                <header className="flex h-16 items-center justify-between border-b border-secondary px-6">
                    <h1 className="text-lg font-semibold text-primary">Admin Panel</h1>
                    {HAS_TIERS && (
                        <button
                            onClick={() => {
                                if (DEFAULT_PREVIEW_TIER) {
                                    document.cookie = `preview_tier=${DEFAULT_PREVIEW_TIER}; path=/; max-age=3600; SameSite=lax`;
                                }
                                router.push("/portal");
                            }}
                            className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-xs transition-colors hover:bg-brand-700"
                        >
                            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                            </svg>
                            View as Investor
                        </button>
                    )}
                </header>
                <div className="p-6">{children}</div>
            </main>
        </div>
    );
}
