"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { config } from "@/config";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [sent, setSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "Failed to send reset email");
                return;
            }

            setSent(true);
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (sent) {
        return (
            <div className="text-center">
                <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-success-100">
                    <svg className="size-6 text-success-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                </div>
                <h2 className="text-display-xs font-semibold text-primary">Check your email</h2>
                <p className="mt-2 text-md text-tertiary">
                    We sent a password reset link to <span className="font-medium text-primary">{email}</span>
                </p>
                <Link
                    href="/login"
                    className="mt-6 inline-block text-sm font-semibold text-brand-600 hover:text-brand-700"
                >
                    &larr; Back to login
                </Link>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-8 lg:hidden">
                <Image src={config.assets.logoLight} alt={config.brand.name} width={100} height={32} />
            </div>

            <h2 className="text-display-xs font-semibold text-primary">Forgot password?</h2>
            <p className="mt-2 text-md text-tertiary">No worries. Enter your email and we&apos;ll send you a reset link.</p>

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

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-md font-semibold text-white shadow-xs transition-colors hover:bg-brand-700 disabled:opacity-50"
                >
                    {loading ? "Sending..." : "Send reset link"}
                </button>
            </form>

            <p className="mt-6 text-center">
                <Link href="/login" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
                    &larr; Back to login
                </Link>
            </p>
        </div>
    );
}
