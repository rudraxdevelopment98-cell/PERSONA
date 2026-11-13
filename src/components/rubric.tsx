export function RubricTable({ rubric, labels }: { rubric: Record<string, number>; labels: Record<string, string> }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
      {Object.entries(rubric).map(([k, v]) => (
        <div key={k}>
          <dt className="text-xs text-muted">{labels[k] ?? k}</dt>
          <dd className="text-sm font-medium tabular-nums">{v}/25</dd>
        </div>
      ))}
    </dl>
  );
}
