import { z } from "zod";

export const featuredCaseSchema = z.object({
  id: z.string(),
});
