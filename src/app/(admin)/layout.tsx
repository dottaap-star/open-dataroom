import { AdminLayout } from "@/components/layouts/admin-layout";

export default function AdminRouteLayout({ children }: { children: React.ReactNode }) {
    return <AdminLayout>{children}</AdminLayout>;
}
