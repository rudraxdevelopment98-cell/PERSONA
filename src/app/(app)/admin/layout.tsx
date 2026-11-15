import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/db/server";
import { hasAnyAdmin, isAdmin, openReportCount } from "@/lib/server/admin";
import { AdminTabs, ClaimAdmin } from "./admin-ui";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireUser();
  if (!(await isAdmin(user.id))) {
    // Hidden unless the first admin still needs to be set up.
    if (await hasAnyAdmin()) notFound();
    return (
      <>
        <PageHeader title="Admin setup" description="Enter the one-time setup code to become this app's first admin." />
        <ClaimAdmin />
      </>
    );
  }
  const open = await openReportCount();
  return (
    <>
      <AdminTabs openReports={open} />
      {children}
    </>
  );
}
