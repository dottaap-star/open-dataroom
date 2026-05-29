"use client";

import { useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = use(params);
    const router = useRouter();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (password !== confirmPassword) {
            setError("Passwords don't match");
            return;
        }

        if (password.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password }),
            });

            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "Reset failed");
                return;
            }

            setSuccess(true);
            setTimeout(() => router.push("/login"), 2000);
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="text-center">
                <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-success-100">
                    <svg className="size-6 text-success-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                </div>
                <h2 className="text-display-xs font-semibold text-primary">Password reset!</h2>
                <p className="mt-2 text-md text-tertiary">Redirecting you to login...</p>
            </div>
        );
    }

    return (
        <div>
            <h2 className="text-display-xs font-semibold text-primary">Set new password</h2>
            <p className="mt-2 text-md text-tertiary">Must be at least 8 characters.</p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                {error && (
                    <div className="rounded-lg border border-error-300 bg-error-25 px-4 py-3 text-sm text-error-700">
                        {error}
                    </div>
                )}

                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-secondary">New password</label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="mt-1.5 block w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-md text-primary shadow-xs placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100"
                    />
                </div>

                <div>
                    <label htmlFor="confirm" className="block text-sm font-medium text-secondary">Confirm password</label>
                    <input
                        id="confirm"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="mt-1.5 block w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-md text-primary shadow-xs placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-md font-semibold text-white shadow-xs transition-colors hover:bg-brand-700 disabled:opacity-50"
                >
                    {loading ? "Resetting..." : "Reset password"}
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
