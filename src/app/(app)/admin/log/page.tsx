import { Card, CardHeader, PageHeader } from "@/components/ui";
import { auditLog, listAdmins } from "@/lib/server/admin";
import { AddAdmin } from "../admin-ui";

export const metadata = { title: "Activity log · Admin" };

export default async function AdminLog() {
  const [log, admins] = await Promise.all([auditLog(), listAdmins()]);
  return (
    <>
      <PageHeader eyebrow="Admin" title="Admins & activity" description="Every admin action is recorded here." />
      <div className="space-y-4">
        <Card>
          <CardHeader title="Admins" />
          <div className="divide-y divide-line">
            {admins.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-5 py-2.5 text-sm">
                <span>
                  <span className="font-semibold">{a.name}</span> <span className="text-muted">{a.email}</span>
                </span>
                <span className="text-xs text-muted">since {new Date(a.since).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
          <div className="px-5 pb-5 pt-3">
            <AddAdmin />
          </div>
        </Card>
        <Card>
          <CardHeader title="Activity log" />
          <div className="divide-y divide-line">
            {log.length === 0 && <p className="px-5 pb-5 text-sm text-muted">No admin actions yet.</p>}
            {log.map((e) => (
              <div key={e.id} className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-2.5 text-sm">
                <span>
                  <span className="font-semibold">{e.admin_name}</span> <code className="rounded bg-bg px-1.5 py-0.5 text-xs">{e.action}</code>{" "}
                  {e.target_label && <span className="text-muted">{e.target_label}</span>}
                  {e.detail && <span className="block text-xs text-muted">“{e.detail}”</span>}
                </span>
                <span className="text-xs text-muted">{new Date(e.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
