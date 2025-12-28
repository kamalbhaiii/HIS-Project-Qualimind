import { z } from "zod";

export const InsightsResponseSchema = z.object({
  executiveSummary: z.string(),
  keyFindings: z.array(z.string()),
  dataQualityObservations: z.array(z.string()),
  correlationInsights: z.array(z.string()),
  preprocessingNotes: z.array(z.string()),
  recommendedNextSteps: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  warnings: z.array(z.string()),
});

export type InsightsResponse = z.infer<typeof InsightsResponseSchema>;
