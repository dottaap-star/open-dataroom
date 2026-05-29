"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { config } from "@/config";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Invalid credentials");
                return;
            }

            // Redirect based on role
            router.push(data.role === "admin" ? "/admin" : "/portal");
            router.refresh();
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="mb-8 lg:hidden">
                <Image src={config.assets.logoLight} alt={config.brand.name} width={100} height={32} />
            </div>

            <h2 className="text-display-xs font-semibold text-primary">Welcome back</h2>
            <p className="mt-2 text-md text-tertiary">Sign in to continue to the {config.brand.name} investor portal.</p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                {error && (
                    <div className="rounded-lg border border-error-300 bg-error-25 px-4 py-3 text-sm text-error-700">
                        {error}
                    </div>
                )}

                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-secondary">
                        Email
                    </label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="you@company.com"
                        className="mt-1.5 block w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-md text-primary shadow-xs placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100"
                    />
                </div>

                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-secondary">
                        Password
                    </label>
                    <div className="relative mt-1.5">
                        <input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="Enter your password"
                            className="block w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 pr-10 text-md text-primary shadow-xs placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-quaternary hover:text-tertiary"
                        >
                            {showPassword ? (
                                <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                    <line x1="1" y1="1" x2="23" y2="23" />
                                </svg>
                            ) : (
                                <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                    <circle cx="12" cy="12" r="3" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-end">
                    <Link href="/forgot-password" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
                        Forgot password?
                    </Link>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-md font-semibold text-white shadow-xs transition-colors hover:bg-brand-700 disabled:opacity-50"
                >
                    {loading ? "Signing in..." : "Sign in"}
                </button>
            </form>

            <p className="mt-8 text-center text-sm text-tertiary">
                Don&apos;t have an account?{" "}
                <span className="text-quaternary">Access is by invitation only.</span>
            </p>
        </div>
    );
}
