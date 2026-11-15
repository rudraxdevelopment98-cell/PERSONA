import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { listReports } from "@/lib/server/admin";
import { ReportCard } from "../admin-ui";

export const metadata = { title: "Reports · Admin" };

export default async function AdminReports({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const tab = (await searchParams).tab === "closed" ? "closed" : "open";
  const reports = await listReports(tab);
  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Reports"
        action={
          <div className="flex rounded-xl border border-line p-0.5 text-xs font-semibold">
            <Link href="/admin/reports" className={`rounded-lg px-3 py-1 ${tab === "open" ? "bg-primary-soft text-primary" : "text-muted"}`}>Open</Link>
            <Link href="/admin/reports?tab=closed" className={`rounded-lg px-3 py-1 ${tab === "closed" ? "bg-primary-soft text-primary" : "text-muted"}`}>Closed</Link>
          </div>
        }
      />
      {reports.length === 0 ? (
        <Card>
          <EmptyState icon={<ShieldCheck className="size-6" />} title={tab === "open" ? "No open reports" : "No closed reports yet"} description="Reports from users about people or circles appear here." />
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <ReportCard key={r.id} report={r} />
          ))}
        </div>
      )}
    </>
  );
}
