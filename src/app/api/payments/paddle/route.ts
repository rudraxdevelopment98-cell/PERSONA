import { handleEvent, verifySignature, webhookSecret } from "@/lib/server/payments";

export const dynamic = "force-dynamic";

/** Paddle webhook: subscription created/updated/canceled. Signed with the endpoint's secret. */
export async function POST(request: Request) {
  const secret = await webhookSecret();
  if (!secret) return new Response("Payments are not configured.", { status: 503 });
  const raw = await request.text();
  if (!verifySignature(raw, request.headers.get("paddle-signature"), secret)) return new Response("Invalid signature.", { status: 401 });
  let event: { event_id?: string; event_type?: string; data?: unknown };
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("Invalid JSON.", { status: 400 });
  }
  if (!event.event_id || !event.event_type) return new Response("Missing event.", { status: 400 });
  await handleEvent({ event_id: event.event_id, event_type: event.event_type, data: event.data });
  return Response.json({ ok: true });
}
