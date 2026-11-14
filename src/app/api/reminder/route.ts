import { getSessionUser } from "@/lib/db/server";
import { dbForUser } from "@/lib/db/server";

/** A daily repeating calendar event (iCalendar) reminding the user to do their session. */
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Please sign in again." }, { status: 401 });

  const url = new URL(request.url);
  const time = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(url.searchParams.get("time") ?? "") ?? ["", "20", "00"];
  const { data: profile } = await dbForUser(user.id).from("profiles").select("timezone").eq("id", user.id).maybeSingle();
  const tz = /^[A-Za-z_+\-/0-9]{1,64}$/.test(profile?.timezone ?? "") ? profile!.timezone : "UTC";

  const now = new Date();
  const ymd = (d: Date) => d.toISOString().slice(0, 10).replaceAll("-", "");
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const origin = url.origin;

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PERSONA 90//Daily reminder//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:persona90-daily-${user.id}@persona90`,
    `DTSTAMP:${stamp}`,
    `DTSTART;TZID=${tz}:${ymd(now)}T${time[1]}${time[2]}00`,
    "DURATION:PT30M",
    "RRULE:FREQ=DAILY;COUNT=90",
    "SUMMARY:PERSONA 90 - today's session",
    `DESCRIPTION:Check-in\\, story\\, scenarios and today's challenge (about 30 minutes). ${origin}/today`,
    `URL:${origin}/today`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Time for your PERSONA 90 session",
    "TRIGGER:PT0M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="persona90-daily-reminder.ics"',
      "Cache-Control": "no-store",
    },
  });
}
