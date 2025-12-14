import { z } from "zod";

const ColumnProfileSchema = z.object({
  name: z.string().min(1),
  inferredType: z.enum(["categorical", "numeric", "unknown"]),
  missingCount: z.number().int().nonnegative(),
  uniqueCount: z.number().int().nonnegative(),
  sampleValues: z.array(z.string()).default([]),
});

export const SuggestPreprocessingRequestSchema = z.object({
  filename: z.string().min(1).optional(),
  // you can cap on API level; service will also clamp
  sampleRows: z.array(z.record(z.string(), z.any())).min(1).max(200),
  columns: z.array(ColumnProfileSchema).min(1),
  // optional override; if omitted, derived from sampleRows length
  sampleRowCount: z.number().int().min(1).max(200).optional(),
});

export type SuggestPreprocessingRequest = z.infer<typeof SuggestPreprocessingRequestSchema>;
