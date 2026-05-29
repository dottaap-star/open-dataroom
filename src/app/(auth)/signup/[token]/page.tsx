"use client";

import { useState, useEffect, use } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { config } from "@/config";

export default function SignupPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = use(params);
    const router = useRouter();
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [validating, setValidating] = useState(true);
    const [invalid, setInvalid] = useState(false);

    useEffect(() => {
        // Validate invite token
        fetch(`/api/auth/validate-invite?token=${token}`)
            .then((res) => res.json())
            .then((data) => {
                if (data.valid) {
                    setEmail(data.email);
                } else {
                    setInvalid(true);
                }
            })
            .catch(() => setInvalid(true))
            .finally(() => setValidating(false));
    }, [token]);

    if (validating) {
        return (
            <div className="flex items-center justify-center py-16">
                <p className="text-md text-tertiary">Validating your invitation...</p>
            </div>
        );
    }

    if (invalid) {
        return (
            <div className="text-center">
                <h2 className="text-display-xs font-semibold text-primary">Invalid or expired invitation</h2>
                <p className="mt-2 text-md text-tertiary">
                    This invitation link is no longer valid. Please contact the admin for a new invitation.
                </p>
            </div>
        );
    }

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
            const res = await fetch("/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, name, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Signup failed");
                return;
            }

            router.push("/portal");
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

            <h2 className="text-display-xs font-semibold text-primary">Create your account</h2>
            <p className="mt-2 text-md text-tertiary">
                You&apos;ve been invited to {config.brand.name}&apos;s investor portal.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                {error && (
                    <div className="rounded-lg border border-error-300 bg-error-25 px-4 py-3 text-sm text-error-700">
                        {error}
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-secondary">Email</label>
                    <input
                        type="email"
                        value={email}
                        disabled
                        className="mt-1.5 block w-full rounded-lg border border-primary bg-secondary px-3.5 py-2.5 text-md text-tertiary shadow-xs"
                    />
                </div>

                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-secondary">
                        Full name
                    </label>
                    <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        placeholder="Your full name"
                        className="mt-1.5 block w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-md text-primary shadow-xs placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100"
                    />
                </div>

                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-secondary">
                        Password
                    </label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="Min. 8 characters"
                        className="mt-1.5 block w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-md text-primary shadow-xs placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100"
                    />
                </div>

                <div>
                    <label htmlFor="confirm" className="block text-sm font-medium text-secondary">
                        Confirm password
                    </label>
                    <input
                        id="confirm"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        placeholder="Confirm your password"
                        className="mt-1.5 block w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-md text-primary shadow-xs placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-md font-semibold text-white shadow-xs transition-colors hover:bg-brand-700 disabled:opacity-50"
                >
                    {loading ? "Creating account..." : "Create account"}
                </button>
            </form>
        </div>
    );
}
