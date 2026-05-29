import { PortalLayout } from "@/components/layouts/portal-layout";

export default function PortalRouteLayout({ children }: { children: React.ReactNode }) {
    return <PortalLayout>{children}</PortalLayout>;
}
