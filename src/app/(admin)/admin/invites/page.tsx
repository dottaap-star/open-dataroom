"use client";

import { useState, useEffect, useCallback } from "react";
import { config } from "@/config";

interface InviteRecord {
    _id: string;
    email: string;
    name?: string;
    tier?: string;
    status: "pending" | "accepted" | "expired";
    invitedBy: string;
    sentAt: string;
    acceptedAt?: string;
    expiresAt: string;
}

interface UserRecord {
    _id: string;
    email: string;
    name: string;
    tier?: string;
    isActive: boolean;
    lastLogin?: string;
}

const TIER_OPTIONS = config.access.tiers.map((t) => ({ value: t.id, label: t.label }));
const TIER_LABELS: Record<string, string> = Object.fromEntries(
    config.access.tiers.map((t) => [t.id, t.label])
);

export default function InvitesPage() {
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [tier, setTier] = useState("");
    const [sending, setSending] = useState(false);
    const [message, setMessage] = useState("");
    const [invites, setInvites] = useState<InviteRecord[]>([]);
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [editingTier, setEditingTier] = useState<{ id: string; value: string } | null>(null);
    const [savingTier, setSavingTier] = useState(false);
    const [revoking, setRevoking] = useState<string | null>(null);

    const fetchInvites = useCallback(async () => {
        const [invitesRes, usersRes] = await Promise.all([
            fetch("/api/admin/invites").then((r) => r.json()),
            fetch("/api/admin/users").then((r) => r.json()),
        ]);
        if (invitesRes.invites) setInvites(invitesRes.invites);
        if (usersRes.users) setUsers(usersRes.users);
    }, []);

    useEffect(() => {
        fetchInvites();
    }, [fetchInvites]);

    // Join users onto invites by email so accepted-invite rows can show
    // account state + render Revoke/Restore.
    const usersByEmail = new Map(users.map((u) => [u.email.toLowerCase(), u]));

    const handleRevocationToggle = async (user: UserRecord) => {
        const action = user.isActive ? "revoke" : "restore";
        const confirmMsg = user.isActive
            ? `Revoke access for ${user.email}? They'll be signed out immediately and any saved tokens will stop working.`
            : `Restore access for ${user.email}? They'll need to log in fresh.`;
        if (!confirm(confirmMsg)) return;

        setRevoking(user._id);
        try {
            const res = await fetch(`/api/admin/users/${user._id}/${action}`, { method: "POST" });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                alert(data.error || `Failed to ${action} user`);
                return;
            }
            await fetchInvites();
        } finally {
            setRevoking(null);
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setSending(true);
        setMessage("");

        try {
            const res = await fetch("/api/admin/invites", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, name, tier: tier || undefined }),
            });

            const data = await res.json();

            if (!res.ok) {
                setMessage(`Error: ${data.error}`);
                return;
            }

            setMessage(`Invitation sent to ${email}`);
            setEmail("");
            setName("");
            setTier("");
            fetchInvites();
        } catch {
            setMessage("Failed to send invitation");
        } finally {
            setSending(false);
        }
    };

    const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
    });

    const statusBadge = (status: string) => {
        const styles = {
            pending: "bg-warning-50 text-warning-700",
            accepted: "bg-success-50 text-success-700",
            expired: "bg-gray-100 text-gray-500",
        };
        return (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status as keyof typeof styles] || styles.pending}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    return (
        <div>
            <h1 className="text-display-xs font-semibold text-primary">Investor Invitations</h1>
            <p className="mt-2 text-md text-tertiary">Invite investors to access the data room.</p>

            {/* Send invite form */}
            <div className="mt-8 rounded-xl border border-secondary bg-primary p-6 shadow-xs">
                <h2 className="text-md font-semibold text-primary">Send New Invitation</h2>
                <form onSubmit={handleInvite} className="mt-4 flex flex-wrap gap-4">
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="investor@company.com"
                        className="flex-1 rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-sm shadow-xs placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100"
                    />
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Name (optional)"
                        className="w-48 rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-sm shadow-xs placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100"
                    />
                    <select
                        value={tier}
                        onChange={(e) => setTier(e.target.value)}
                        required
                        className="w-40 rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-sm shadow-xs focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100"
                    >
                        <option value="">Select access...</option>
                        {TIER_OPTIONS.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                    </select>
                    <button
                        type="submit"
                        disabled={sending}
                        className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white shadow-xs hover:bg-brand-700 disabled:opacity-50"
                    >
                        {sending ? "Sending..." : "Send Invite"}
                    </button>
                </form>
                {message && (
                    <p className={`mt-3 text-sm ${message.startsWith("Error") ? "text-error-600" : "text-success-600"}`}>
                        {message}
                    </p>
                )}
            </div>

            {/* Invites table */}
            <div className="mt-8">
                <h2 className="mb-4 text-md font-semibold text-primary">Sent Invitations ({invites.length})</h2>
                <div className="overflow-hidden rounded-xl border border-secondary shadow-xs">
                    <table className="w-full">
                        <thead className="bg-secondary">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-tertiary">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-tertiary">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-tertiary">Access</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-tertiary">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-tertiary">Sent</th>
                                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-tertiary">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary bg-primary">
                            {invites.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-quaternary">
                                        No invitations sent yet
                                    </td>
                                </tr>
                            ) : (
                                invites.map((invite) => (
                                    <tr key={invite._id}>
                                        <td className="px-6 py-4 text-sm font-medium text-primary">{invite.email}</td>
                                        <td className="px-6 py-4 text-sm text-tertiary">{invite.name || "-"}</td>
                                        <td className="px-6 py-4">
                                            {editingTier?.id === invite._id ? (
                                                <div className="flex items-center gap-1.5">
                                                    <select
                                                        value={editingTier.value}
                                                        onChange={(e) => setEditingTier({ id: invite._id, value: e.target.value })}
                                                        className="rounded-md border border-brand-300 bg-primary px-2 py-1 text-xs ring-2 ring-brand-100 focus:outline-none"
                                                    >
                                                        <option value="">Select...</option>
                                                        {TIER_OPTIONS.map((t) => (
                                                            <option key={t.value} value={t.value}>{t.label}</option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        disabled={!editingTier.value || savingTier}
                                                        onClick={async () => {
                                                            if (!editingTier.value) return;
                                                            setSavingTier(true);
                                                            const res = await fetch("/api/admin/invites", {
                                                                method: "PATCH",
                                                                headers: { "Content-Type": "application/json" },
                                                                body: JSON.stringify({ id: invite._id, tier: editingTier.value }),
                                                            });
                                                            if (res.ok) {
                                                                setInvites((prev) =>
                                                                    prev.map((inv) =>
                                                                        inv._id === invite._id ? { ...inv, tier: editingTier.value } : inv
                                                                    )
                                                                );
                                                            }
                                                            setSavingTier(false);
                                                            setEditingTier(null);
                                                        }}
                                                        className="rounded p-1 text-success-600 hover:bg-success-50 disabled:opacity-40"
                                                        title="Save"
                                                    >
                                                        <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                                                            <polyline points="20 6 9 17 4 12" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingTier(null)}
                                                        className="rounded p-1 text-tertiary hover:bg-secondary"
                                                        title="Cancel"
                                                    >
                                                        <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                                                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5">
                                                    {invite.tier ? (
                                                        <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                                                            {TIER_LABELS[invite.tier] || invite.tier}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-quaternary">None</span>
                                                    )}
                                                    <button
                                                        onClick={() => setEditingTier({ id: invite._id, value: invite.tier || "" })}
                                                        className="rounded p-1 text-tertiary hover:bg-secondary hover:text-primary"
                                                        title="Edit access"
                                                    >
                                                        <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">{statusBadge(invite.status)}</td>
                                        <td className="px-6 py-4 text-sm text-tertiary">{formatDate(invite.sentAt)}</td>
                                        <td className="px-6 py-4 text-right">
                                            {invite.status === "accepted" ? (
                                                (() => {
                                                    const user = usersByEmail.get(invite.email.toLowerCase());
                                                    if (!user) {
                                                        return <span className="text-xs text-quaternary">User missing</span>;
                                                    }
                                                    const busy = revoking === user._id;
                                                    return (
                                                        <div className="flex items-center justify-end gap-3">
                                                            {!user.isActive && (
                                                                <span className="rounded-full bg-error-50 px-2 py-0.5 text-xs font-medium text-error-700">
                                                                    Revoked
                                                                </span>
                                                            )}
                                                            <button
                                                                disabled={busy}
                                                                onClick={() => handleRevocationToggle(user)}
                                                                className={
                                                                    user.isActive
                                                                        ? "text-xs font-medium text-error-600 hover:text-error-700 disabled:opacity-40"
                                                                        : "text-xs font-medium text-brand-600 hover:text-brand-700 disabled:opacity-40"
                                                                }
                                                            >
                                                                {busy ? "…" : user.isActive ? "Revoke" : "Restore"}
                                                            </button>
                                                        </div>
                                                    );
                                                })()
                                            ) : (
                                                <button
                                                    onClick={async () => {
                                                        if (!confirm(`Remove invite for ${invite.email}?`)) return;
                                                        await fetch("/api/admin/invites", {
                                                            method: "DELETE",
                                                            headers: { "Content-Type": "application/json" },
                                                            body: JSON.stringify({ id: invite._id }),
                                                        });
                                                        fetchInvites();
                                                    }}
                                                    className="text-xs font-medium text-error-600 hover:text-error-700"
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
