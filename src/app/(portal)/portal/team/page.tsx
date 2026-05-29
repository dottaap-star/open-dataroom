import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { config } from "@/config";

export const metadata: Metadata = {
    title: "Team",
};

export default function TeamPage() {
    if (!config.team.enabled) {
        redirect("/portal");
    }

    const { headline, story, members } = config.team;

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-display-xs font-semibold text-primary">{headline ?? "Meet the Team"}</h1>
            </div>

            {/* Story section — only renders if story is set */}
            {story && (
                <div className="mb-12 rounded-xl bg-brand-25 p-8">
                    <h2 className="text-lg font-semibold text-brand-800">Our Story</h2>
                    <p className="mt-3 text-md text-brand-700 whitespace-pre-line">{story}</p>
                </div>
            )}

            {/* Founder cards */}
            {members.length > 0 && (
                <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                    {members.map((member) => (
                        <div
                            key={member.name}
                            className="overflow-hidden rounded-2xl border border-secondary bg-primary shadow-xs"
                        >
                            {member.photo && (
                                <div className="aspect-[4/5] bg-tertiary">
                                    <Image
                                        src={member.photo}
                                        alt={member.name}
                                        width={400}
                                        height={500}
                                        className="size-full object-cover"
                                    />
                                </div>
                            )}
                            <div className="p-5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold text-primary">{member.name}</h3>
                                        <p className="text-sm font-medium text-brand-600">{member.role}</p>
                                    </div>
                                    {member.linkedinUrl && (
                                        <a
                                            href={member.linkedinUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-quaternary transition-colors hover:text-primary"
                                            aria-label={`${member.name} on LinkedIn`}
                                        >
                                            <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                            </svg>
                                        </a>
                                    )}
                                </div>
                                {member.bio && <p className="mt-3 text-sm text-tertiary">{member.bio}</p>}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Empty-state hint if team is enabled but no members configured */}
            {members.length === 0 && (
                <div className="rounded-xl border border-dashed border-secondary p-8 text-center">
                    <p className="text-sm text-quaternary">
                        Add team members in <code className="font-mono">dataroom.config.ts</code> under{" "}
                        <code className="font-mono">team.members</code>.
                    </p>
                </div>
            )}
        </div>
    );
}
