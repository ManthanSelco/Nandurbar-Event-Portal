import { z } from "zod";

export const selectRequirementSchema = z.object({
  participantId: z.string().min(1),
  requirementId: z.string().min(1),
  message: z.string().trim().max(2000).optional().default(""),
});

export const adminMessageSchema = z.object({
  message: z.string().trim().min(1).max(4000),
});

export const bulkMessageSchema = z.object({
  participantIds: z.array(z.string().min(1)).min(1),
  message: z.string().trim().min(1).max(4000),
});
