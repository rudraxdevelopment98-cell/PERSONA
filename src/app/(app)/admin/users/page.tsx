import Link from "next/link";
import { Badge, Card, PageHeader } from "@/components/ui";
import { listUsers } from "@/lib/server/admin";

export const metadata = { title: "Users · Admin" };

const FILTERS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active (7 days)" },
  { id: "inactive", label: "Inactive" },
  { id: "suspended", label: "Suspended" },
  { id: "admins", label: "Admins" },
];

function ago(iso: string | null) {
  if (!iso) return "never";
  const d = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  return d <= 0 ? "today" : d === 1 ? "yesterday" : `${d}d ago`;
}

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string; f?: string; p?: string }> }) {
  const sp = await searchParams;
  const filter = FILTERS.some((f) => f.id === sp.f) ? sp.f! : "all";
  const page = Math.max(0, Number(sp.p) || 0);
  const { rows, total } = await listUsers({ search: sp.q?.slice(0, 100), filter, page });
  const qs = (o: Record<string, string | number | undefined>) => {
    const u = new URLSearchParams();
    const merged = { q: sp.q, f: filter, ...o };
    for (const [k, v] of Object.entries(merged)) if (v !== undefined && v !== "" && !(k === "f" && v === "all") && !(k === "p" && Number(v) === 0)) u.set(k, String(v));
    const s = u.toString();
    return s ? `?${s}` : "";
  };

  return (
    <>
      <PageHeader eyebrow="Admin" title="Users" description={`${total.toLocaleString()} ${filter === "all" ? "accounts" : "matching"}.`} />
      <div className="space-y-4">
        <form className="flex flex-col gap-2 sm:flex-row" action="/admin/users">
          <input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Search name or email"
            aria-label="Search users"
            className="h-10 w-full rounded-xl border border-line bg-surface px-3.5 text-sm focus:border-primary/40 focus:outline-none focus:ring-4 focus:ring-primary/10"
          />
          {filter !== "all" && <input type="hidden" name="f" value={filter} />}
          <button className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-white">Search</button>
        </form>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <Link key={f.id} href={`/admin/users${qs({ f: f.id, p: 0 })}`} className={`rounded-full px-3 py-1 text-xs font-semibold ${filter === f.id ? "bg-primary text-white" : "bg-surface text-muted ring-1 ring-line"}`}>
              {f.label}
            </Link>
          ))}
        </div>
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">Joined</th>
                <th className="px-4 py-3 text-right font-semibold">Sessions</th>
                <th className="px-4 py-3 text-right font-semibold">Streak</th>
                <th className="px-4 py-3 font-semibold">Last active</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">No users match.</td>
                </tr>
              )}
              {rows.map((u) => (
                <tr key={u.id} className="border-b border-line last:border-0 hover:bg-bg">
                  <td className="px-4 py-3">
                    <Link href={`/admin/users/${u.id}`} className="font-semibold hover:underline">{u.name}</Link>
                    <span className="ml-2 inline-flex gap-1 align-middle">
                      {u.admin && <Badge tone="accent">admin</Badge>}
                      {u.suspended && <Badge tone="danger">suspended</Badge>}
                    </span>
                    <span className="block text-xs text-muted">{u.email}</span>
                  </td>
                  <td className="px-4 py-3 text-muted">{new Date(u.joined).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{u.sessions}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{u.streak ?? 0}</td>
                  <td className="px-4 py-3 text-muted">{ago(u.last_active)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <div className="flex justify-between text-sm">
          {page > 0 ? <Link href={`/admin/users${qs({ p: page - 1 })}`} className="font-semibold text-primary">← Newer</Link> : <span />}
          {(page + 1) * 50 < total ? <Link href={`/admin/users${qs({ p: page + 1 })}`} className="font-semibold text-primary">Older →</Link> : <span />}
        </div>
      </div>
    </>
  );
}
