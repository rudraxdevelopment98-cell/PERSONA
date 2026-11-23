"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { EyeOff, Lock } from "lucide-react";
import { setPausedAction, setSharingAction, unblockAction } from "../actions";
import { Alert, Button, Card, CardHeader, cx } from "@/components/ui";
import type { ShareItem } from "@/lib/domain/social";
import { useT } from "@/lib/i18n/client";

type Item = { id: ShareItem; label: string; description: string };

function ItemPicker({ items, value, onChange, disabled }: { items: Item[]; value: ShareItem[]; onChange: (v: ShareItem[]) => void; disabled?: boolean }) {
  const t = useT();
  return (
    <div className="divide-y divide-line">
      {items.map((i) => {
        const on = value.includes(i.id);
        return (
          <label key={i.id} className={cx("flex cursor-pointer items-start gap-3 py-3", disabled && "opacity-50")}>
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-[var(--color-primary)]"
              checked={on}
              disabled={disabled}
              onChange={() => onChange(on ? value.filter((v) => v !== i.id) : [...value, i.id])}
            />
            <span>
              <span className="block text-sm font-semibold">{t(i.label)}</span>
              <span className="block text-xs text-muted">{t(i.description)}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}

export function SharingForm({
  items,
  sharing,
  circles,
  blocked,
  push,
}: {
  items: Item[];
  sharing: { friends: ShareItem[]; circles: Record<string, ShareItem[]>; paused: boolean };
  circles: { id: string; name: string; emoji: string | null }[];
  blocked: { id: string; name: string }[];
  push: ReactNode;
}) {
  const t = useT();
  const router = useRouter();
  const [friends, setFriends] = useState<ShareItem[]>(sharing.friends);
  const [overrides, setOverrides] = useState<Record<string, ShareItem[] | null>>(sharing.circles);
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      setMsg(null);
      const results = [await setSharingAction({ circleId: null, items: friends })];
      for (const c of circles) results.push(await setSharingAction({ circleId: c.id, items: overrides[c.id] ?? null }));
      const err = results.find((r) => r.error);
      setMsg(err?.error ? { tone: "danger", text: err.error } : { tone: "success", text: "Saved." });
      router.refresh();
    });

  const togglePause = () =>
    start(async () => {
      await setPausedAction(!sharing.paused);
      router.refresh();
    });

  const label = (ids: ShareItem[]) => (ids.length ? items.filter((i) => ids.includes(i.id)).map((i) => i.label).join(", ") : "Nothing");

  return (
    <div className="space-y-4">
      <Card className={cx("p-5", sharing.paused && "border-warning/40")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <EyeOff className="mt-0.5 size-5 text-muted" />
            <div>
              <p className="font-bold">{sharing.paused ? t("Sharing is paused") : t("Pause all sharing")}</p>
              <p className="text-sm text-muted">{sharing.paused ? t("Nobody can see your progress until you resume.") : t("Hide everything from friends and circles at once - useful for a break.")}</p>
            </div>
          </div>
          <Button variant={sharing.paused ? "primary" : "secondary"} onClick={togglePause} disabled={pending}>
            {sharing.paused ? t("Resume sharing") : t("Pause")}
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader title={t("What friends see")} description={t("Applies to all friends, and to circles unless you set something different below.")} icon={<Lock className="mt-0.5 size-5 text-primary" />} />
        <div className="px-5 pb-4">
          <ItemPicker items={items} value={friends} onChange={setFriends} disabled={sharing.paused} />
          <p className="mt-2 rounded-xl bg-bg px-3 py-2 text-xs text-muted">{t("Preview - friends will see:")}{" "}<b className="text-ink">{label(friends)}</b></p>
        </div>
      </Card>

      {circles.length > 0 && (
        <Card>
          <CardHeader title={t("Per-circle settings")} description={t("Share more (or less) with a particular circle. A circle uses your friend settings unless you customise it.")} />
          <div className="space-y-4 px-5 pb-5">
            {circles.map((c) => {
              const custom = overrides[c.id];
              return (
                <div key={c.id} className="rounded-xl border border-line p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{c.emoji} {c.name}</p>
                    <label className="flex items-center gap-2 text-xs font-semibold text-muted">
                      <input
                        type="checkbox"
                        className="size-4 accent-[var(--color-primary)]"
                        checked={Boolean(custom)}
                        onChange={() => setOverrides((o) => ({ ...o, [c.id]: custom ? null : [...friends] }))}
                      />{t("Customise")}</label>
                  </div>
                  {custom ? (
                    <ItemPicker items={items} value={custom} onChange={(v) => setOverrides((o) => ({ ...o, [c.id]: v }))} disabled={sharing.paused} />
                  ) : (
                    <p className="mt-1 text-xs text-muted">{t("Same as friends: {0}", label(friends))}</p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      <Button onClick={save} disabled={pending}>{pending ? t("Saving...") : t("Save sharing settings")}</Button>

      <Card>
        <CardHeader title={t("Notifications")} description={t("Get a ping when friends cheer you, accept invites or start a race.")} />
        <div className="px-5 pb-5">{push}</div>
      </Card>

      <Card>
        <CardHeader title={t("Blocked people")} description={t("Blocked people can't see you, cheer you, invite you or race with you.")} />
        <div className="px-5 pb-5">
          {blocked.length === 0 && <p className="text-sm text-muted">{t("Nobody blocked.")}</p>}
          {blocked.map((b) => (
            <div key={b.id} className="flex items-center justify-between border-t border-line py-2 first:border-0">
              <span className="text-sm font-semibold">{b.name}</span>
              <Button
                variant="ghost"
                onClick={() =>
                  start(async () => {
                    await unblockAction(b.id);
                    router.refresh();
                  })
                }
              >{t("Unblock")}</Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
