import { describe, expect, it } from "vitest";
import { z } from "zod";
import { toOutputSchema } from "./output-schema";
import * as S from "./schemas";

const schemas = Object.entries(S).filter(([, v]) => v instanceof z.ZodType) as [string, z.ZodType][];

function walk(node: unknown, visit: (n: Record<string, unknown>) => void) {
  if (Array.isArray(node)) return node.forEach((n) => walk(n, visit));
  if (node && typeof node === "object") {
    visit(node as Record<string, unknown>);
    Object.values(node).forEach((v) => walk(v, visit));
  }
}

describe("AI output schemas", () => {
  it.each(schemas)("%s converts to a closed JSON schema", (_name, schema) => {
    const json = toOutputSchema(z.toJSONSchema(schema, { io: "input" }));
    walk(json, (n) => {
      if (n.type === "object") {
        expect(n.additionalProperties).toBe(false);
        expect(n.required).toEqual(Object.keys(n.properties as object));
      }
      expect(n).not.toHaveProperty("minimum");
      expect(n).not.toHaveProperty("$schema");
    });
  });

  it("clamps rubric scores and totals them", () => {
    const parsed = S.scenarioEvaluationSchema.parse({
      rubric: { situational_awareness: 30, quality_of_reasoning: 20.4, independence: -2, practicality: 25 },
      what_went_well: "",
      to_improve: "",
      practise_next: "",
      pattern_note: "",
    });
    expect(parsed.rubric).toEqual({ situational_awareness: 25, quality_of_reasoning: 20, independence: 0, practicality: 25 });
    expect(S.rubricTotal(parsed.rubric)).toBe(70);
  });
});
