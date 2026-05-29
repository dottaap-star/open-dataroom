"use client";

import { useState, useEffect, useCallback } from "react";

interface LogRecord {
    _id: string;
    userName: string;
    userEmail: string;
    action: string;
    resourceName?: string;
    metadata?: Record<string, unknown>;
    ip: string;
    location?: string;
    timestamp: string;
}

interface Investor {
    _id: string;
    email: string;
    name: string;
}

const ACTION_LABELS: Record<string, string> = {
    login: "Login",
    view_document: "Viewed Document",
    chat_message: "Chat Message",
    page_view: "Page View",
};

const ACTION_COLORS: Record<string, string> = {
    login: "bg-brand-50 text-brand-700",
    view_document: "bg-blue-50 text-blue-700",
    chat_message: "bg-purple-50 text-purple-700",
    page_view: "bg-gray-100 text-gray-600",
};

const inputClass =
    "rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-sm shadow-xs focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100";

export default function ActivityPage() {
    const [logs, setLogs] = useState<LogRecord[]>([]);
    const [investors, setInvestors] = useState<Investor[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const PER_PAGE = 15;

    // Filters
    const [actionFilter, setActionFilter] = useState("");
    const [investorFilter, setInvestorFilter] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [resourceFilter, setResourceFilter] = useState("");

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (actionFilter) params.set("action", actionFilter);
        if (investorFilter) params.set("userEmail", investorFilter);
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);
        if (resourceFilter) params.set("resource", resourceFilter);

        const res = await fetch(`/api/admin/activity?${params}`);
        const data = await res.json();
        if (data.logs) setLogs(data.logs);
        if (data.investors) setInvestors(data.investors);
        setPage(0);
        setLoading(false);
    }, [actionFilter, investorFilter, dateFrom, dateTo, resourceFilter]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const clearFilters = () => {
        setActionFilter("");
        setInvestorFilter("");
        setDateFrom("");
        setDateTo("");
        setResourceFilter("");
    };

    const hasFilters = actionFilter || investorFilter || dateFrom || dateTo || resourceFilter;

    const formatDate = (d: string) =>
        new Date(d).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });

    return (
        <div>
            <h1 className="text-display-xs font-semibold text-primary">Activity Log</h1>
            <p className="mt-2 text-md text-tertiary">Detailed access logs for all investor activity.</p>

            {/* Filters */}
            <div className="mt-8 rounded-xl border border-secondary bg-primary p-4 shadow-xs">
                <div className="flex flex-wrap items-end gap-4">
                    {/* Investor */}
                    <div>
                        <label className="mb-1 block text-xs font-medium text-tertiary">Investor</label>
                        <select value={investorFilter} onChange={(e) => setInvestorFilter(e.target.value)} className={inputClass}>
                            <option value="">All Investors</option>
                            {investors.map((inv) => (
                                <option key={inv._id} value={inv.email}>
                                    {inv.name} ({inv.email})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Action */}
                    <div>
                        <label className="mb-1 block text-xs font-medium text-tertiary">Action</label>
                        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className={inputClass}>
                            <option value="">All Actions</option>
                            <option value="login">Login</option>
                            <option value="view_document">Document View</option>
                            <option value="chat_message">Chat Message</option>
                            <option value="page_view">Page View</option>
                        </select>
                    </div>

                    {/* Date From */}
                    <div>
                        <label className="mb-1 block text-xs font-medium text-tertiary">From</label>
                        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={inputClass} />
                    </div>

                    {/* Date To */}
                    <div>
                        <label className="mb-1 block text-xs font-medium text-tertiary">To</label>
                        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={inputClass} />
                    </div>

                    {/* Document search */}
                    <div>
                        <label className="mb-1 block text-xs font-medium text-tertiary">Document</label>
                        <input
                            type="text"
                            value={resourceFilter}
                            onChange={(e) => setResourceFilter(e.target.value)}
                            placeholder="Search by name..."
                            className={`${inputClass} w-44`}
                        />
                    </div>

                    {/* Clear + count */}
                    <div className="flex items-center gap-3">
                        {hasFilters && (
                            <button onClick={clearFilters} className="text-sm font-medium text-brand-600 hover:text-brand-700">
                                Clear filters
                            </button>
                        )}
                        <span className="text-sm text-tertiary">{logs.length} records</span>
                    </div>
                </div>
            </div>

            {/* Activity table */}
            <div className="mt-6 overflow-hidden rounded-xl border border-secondary shadow-xs">
                <table className="w-full">
                    <thead className="bg-secondary">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-tertiary">Investor</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-tertiary">Action</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-tertiary">Detail</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-tertiary">Timestamp</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-tertiary">Location</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-secondary bg-primary">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-sm text-quaternary">Loading...</td>
                            </tr>
                        ) : logs.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-sm text-quaternary">
                                    {hasFilters ? "No activity matching filters" : "No activity recorded yet"}
                                </td>
                            </tr>
                        ) : (
                            logs
                                .slice(page * PER_PAGE, (page + 1) * PER_PAGE)
                                .map((log) => (
                                    <tr key={log._id}>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-medium text-primary">{log.userName}</p>
                                            <p className="text-xs text-quaternary">{log.userEmail}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ACTION_COLORS[log.action] || "bg-gray-100 text-gray-600"}`}>
                                                {ACTION_LABELS[log.action] || log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-tertiary">
                                            {log.resourceName || (typeof log.metadata?.message === "string" ? log.metadata.message.slice(0, 60) : "-")}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-tertiary">{formatDate(log.timestamp)}</td>
                                        <td className="px-6 py-4 text-sm text-tertiary">{log.location || log.ip}</td>
                                    </tr>
                                ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {logs.length > PER_PAGE && (
                <div className="mt-4 flex items-center justify-between">
                    <p className="text-xs text-quaternary">
                        Showing {page * PER_PAGE + 1}–{Math.min((page + 1) * PER_PAGE, logs.length)} of {logs.length}
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage((p) => p - 1)}
                            disabled={page === 0}
                            className="rounded-lg border border-secondary px-3 py-1.5 text-xs font-medium text-tertiary transition-colors hover:bg-secondary disabled:opacity-40"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setPage((p) => p + 1)}
                            disabled={(page + 1) * PER_PAGE >= logs.length}
                            className="rounded-lg border border-secondary px-3 py-1.5 text-xs font-medium text-tertiary transition-colors hover:bg-secondary disabled:opacity-40"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
