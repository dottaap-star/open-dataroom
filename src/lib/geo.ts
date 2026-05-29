/**
 * Resolve an IP address to a location string using ip-api.com (free, no key needed).
 * Returns "City, Country" or null if lookup fails.
 * Rate limit: 45 requests/minute (plenty for an investor portal).
 */
export async function resolveIpLocation(ip: string): Promise<{ location: string; country: string } | null> {
    if (!ip || ip === "unknown" || ip === "::1" || ip.startsWith("127.") || ip.startsWith("192.168.")) {
        return null;
    }

    try {
        const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,city,regionName,country,countryCode`, {
            signal: AbortSignal.timeout(3000),
        });

        if (!res.ok) return null;

        const data = await res.json();

        if (data.status !== "success") return null;

        const parts = [data.city, data.regionName, data.country].filter(Boolean);
        return {
            location: parts.join(", "),
            country: data.countryCode || data.country || "",
        };
    } catch {
        return null; // Non-critical, don't block logging
    }
}
