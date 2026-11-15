import { Card, CardHeader, PageHeader } from "@/components/ui";
import { listCampaigns, listSponsorRequests } from "@/lib/server/admin";
import { requestOrigin } from "@/lib/server/origin";
import { CampaignForm, CampaignRow, RequestRow } from "./sponsors-ui";

export const metadata = { title: "Sponsors · Admin" };

export default async function AdminSponsors() {
  const [campaigns, requests, origin] = await Promise.all([listCampaigns(), listSponsorRequests(), requestOrigin()]);
  const views = campaigns.reduce((a, c) => a + c.views_30d, 0);
  const clicks = campaigns.reduce((a, c) => a + c.clicks_30d, 0);
  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Sponsors"
        description={`Sponsored cards are shown only to Free users, clearly labelled. Last 30 days: ${views.toLocaleString()} views, ${clicks.toLocaleString()} clicks.`}
      />
      <div className="space-y-4">
        <CampaignForm />
        <Card>
          <CardHeader title="Campaigns" />
          <div className="divide-y divide-line">
            {campaigns.length === 0 && <p className="px-5 pb-5 text-sm text-muted">No campaigns yet.</p>}
            {campaigns.map((c) => (
              <CampaignRow key={c.id} c={c} />
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader title="Promotion requests" description={`From the public page ${origin}/advertise - share it with authors, podcasters and course creators.`} />
          <div className="divide-y divide-line">
            {requests.length === 0 && <p className="px-5 pb-5 text-sm text-muted">No requests yet.</p>}
            {requests.map((r) => (
              <RequestRow key={r.id} r={r} />
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
