/**
 * Structured outputs accept a subset of JSON Schema. Strip numeric/length
 * constraints (Zod re-checks or clamps values after parsing) and close every
 * object so the model cannot add or omit properties.
 */
const UNSUPPORTED_KEYS = new Set([
  "$schema",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "minLength",
  "maxLength",
  "pattern",
  "format",
  "minItems",
  "maxItems",
  "multipleOf",
]);

export function toOutputSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(toOutputSchema);
  if (!node || typeof node !== "object") return node;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(node)) {
    if (UNSUPPORTED_KEYS.has(k)) continue;
    out[k] = toOutputSchema(v);
  }
  if (out.type === "object") {
    out.additionalProperties = false;
    if (out.properties && typeof out.properties === "object") out.required = Object.keys(out.properties);
  }
  return out;
}
