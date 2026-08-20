import { z } from "zod";

export const createSupportRequirementSchema = z.object({
  name: z.string().trim().min(2).max(150),
  description: z.string().trim().max(500).optional().default(""),
  keywords: z.array(z.string().trim().min(1)).optional().default([]),
  isActive: z.boolean().optional().default(true),
});

export const updateSupportRequirementSchema =
  createSupportRequirementSchema.partial();
