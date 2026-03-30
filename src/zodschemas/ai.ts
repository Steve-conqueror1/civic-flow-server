import { z } from "zod";

export const featuredCaseSchema = z.object({
  id: z.string(),
});

export const AnalyseRequestSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  note: z.string().optional(),
});

export type AnalyseRequestBody = z.infer<typeof AnalyseRequestSchema>;
