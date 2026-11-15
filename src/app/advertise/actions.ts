"use server";

import { z } from "zod";
import { submitRequest } from "@/lib/server/sponsors";

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(80),
  email: z.string().trim().email("Please enter a valid email.").max(200),
  category: z.enum(["book", "podcast", "course", "app", "event", "other"]),
  link: z.string().trim().max(400),
  budget: z.string().trim().max(60),
  message: z.string().trim().max(1500),
  website: z.string().max(0).optional(), // honeypot: must stay empty
});

export async function requestPromotion(input: unknown): Promise<{ error?: string }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  try {
    await submitRequest(parsed.data);
    return {};
  } catch {
    return { error: "We're getting a lot of requests right now. Please try again in an hour." };
  }
}
