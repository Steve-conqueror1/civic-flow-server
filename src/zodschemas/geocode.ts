import { z } from "zod";

export const GeocodeQuerySchema = z.object({
  q: z.string().min(1, "Search query is required"),
  limit: z.coerce.number().int().min(1).max(10).default(5),
});

export type GeocodeQuery = z.infer<typeof GeocodeQuerySchema>;
