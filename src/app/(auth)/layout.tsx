import Image from "next/image";
import { config } from "@/config";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen">
            {/* Left panel - branding (dark surface, uses the inverted logo) */}
            <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-brand-700 p-12 lg:flex">
                {/* Subtle accent glow — picks up the example's accent ramp */}
                <div
                    aria-hidden
                    className="pointer-events-none absolute -top-20 -right-20 h-[480px] w-[480px] rounded-full bg-accent-400 opacity-15 blur-3xl"
                />
                <div className="relative">
                    <Image
                        src={config.assets.logoDark}
                        alt={config.brand.name}
                        width={280}
                        height={64}
                        className="h-16 w-auto"
                        priority
                    />
                </div>
                <div className="relative max-w-md">
                    <h1 className="text-display-md font-semibold leading-tight text-white">
                        {config.brand.tagline}
                    </h1>
                    <p className="mt-6 text-lg text-brand-100/80">
                        Secure access to {config.brand.name}&apos;s business documents, financials, and team
                        information. Ask our AI assistant anything about the opportunity.
                    </p>
                </div>
                <p className="relative text-sm text-brand-200/70">
                    &copy; {new Date().getFullYear()} {config.brand.name}. All rights reserved.
                </p>
            </div>

            {/* Right panel - auth form */}
            <div className="flex w-full flex-col items-center justify-center px-6 lg:w-1/2">
                <div className="w-full max-w-md">{children}</div>
            </div>
        </div>
    );
}
