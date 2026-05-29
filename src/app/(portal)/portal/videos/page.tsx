"use client";

import { redirect } from "next/navigation";
import { config } from "@/config";

export default function VideosPage() {
    if (!config.videos.enabled) {
        redirect("/portal");
    }

    const { items } = config.videos;

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-display-xs font-semibold text-primary">Videos</h1>
                <p className="mt-2 text-md text-tertiary">Watch our product demo and pitch recordings.</p>
            </div>

            {items.length === 0 ? (
                <div className="rounded-xl border border-dashed border-secondary p-8 text-center">
                    <p className="text-sm text-quaternary">
                        Add videos in <code className="font-mono">dataroom.config.ts</code> under{" "}
                        <code className="font-mono">videos.items</code>.
                    </p>
                </div>
            ) : (
                <div className="grid gap-8 lg:grid-cols-2">
                    {items.map((video, idx) => (
                        <div
                            key={"youtubeId" in video ? video.youtubeId : video.mp4Url}
                            className="overflow-hidden rounded-xl border border-secondary bg-primary shadow-xs"
                        >
                            <div className="aspect-video">
                                {"youtubeId" in video ? (
                                    <iframe
                                        src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?rel=0`}
                                        title={video.title}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                        className="size-full"
                                    />
                                ) : (
                                    <video
                                        src={video.mp4Url}
                                        controls
                                        controlsList="nodownload"
                                        onContextMenu={(e) => e.preventDefault()}
                                        className="size-full"
                                    />
                                )}
                            </div>
                            <div className="p-5">
                                <h2 className="text-lg font-semibold text-primary">{video.title}</h2>
                                {video.description && (
                                    <p className="mt-1 text-sm text-tertiary">{video.description}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
