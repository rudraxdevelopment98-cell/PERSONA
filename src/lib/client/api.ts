/** Small fetch wrapper for the app's JSON API routes. Throws with the server's message on error. */
export async function postJSON<T = unknown>(url: string, body: unknown = {}): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((data as { error?: string }).error ?? `Request failed (${res.status})`) as Error & { upgrade?: boolean };
    // 402: a free-plan limit was reached; screens show an upgrade link.
    err.upgrade = Boolean((data as { upgrade?: boolean }).upgrade);
    throw err;
  }
  return data as T;
}
