import { Card, CardHeader, PageHeader } from "@/components/ui";
import { audienceSize, listBroadcasts } from "@/lib/server/admin";
import { BroadcastForm } from "../admin-ui";

export const metadata = { title: "Broadcast · Admin" };

export default async function AdminBroadcast() {
  const [all, active, inactive, history] = await Promise.all([audienceSize("all"), audienceSize("active"), audienceSize("inactive"), listBroadcasts()]);
  return (
    <>
      <PageHeader eyebrow="Admin" title="Announcements" description="Send a message to users' inbox, and as a phone notification to those who turned them on." />
      <div className="space-y-4">
        <BroadcastForm sizes={{ all, active, inactive }} />
        <Card>
          <CardHeader title="Sent" />
          <div className="divide-y divide-line">
            {history.length === 0 && <p className="px-5 pb-5 text-sm text-muted">Nothing sent yet.</p>}
            {history.map((b) => (
              <div key={b.id} className="px-5 py-3 text-sm">
                <p className="font-semibold">{b.title}</p>
                <p className="text-muted">{b.body}</p>
                <p className="mt-1 text-xs text-muted">
                  {new Date(b.created_at).toLocaleString()} · {b.audience} · {b.recipients} people · by {b.admin_name}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
