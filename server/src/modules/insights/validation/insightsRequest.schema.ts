import { z } from "zod";

/**
 * This is intentionally “shape-based” (not tied to DB models),
 * so the microservice remains decoupled.
 */
export const InsightsRequestSchema = z.object({
  filename: z.string().optional(),
  rawData: z.string().optional(),          // CSV string (small datasets) or omitted
  processedData: z.string().optional(),    // CSV string (small datasets) or omitted

  // processingSummary.metadata subset (your backend structure)
  metadata: z
    .object({
      warnings: z.array(z.string()).optional(),

      correlation: z
        .object({
          enabled: z.boolean().optional(),
          method: z.string().optional(),
          n_used: z.number().optional(),
          used_columns: z.array(z.string()).optional(),
          requested_columns: z.array(z.string()).optional(),
          top_pairs: z
            .array(
              z.object({
                r: z.number(),
                col1: z.string(),
                col2: z.string(),
              })
            )
            .optional(),
          missing_columns: z.array(z.string()).optional(),
          constant_columns: z.array(z.string()).optional(),
          non_numeric_columns: z.array(z.string()).optional(),
        })
        .optional(),

      scaling_stats: z.record(
        z.string(),
        z.object({
          sd: z.number().optional(),
          mean: z.number().optional(),
          method: z.string().optional(),
        })
      ).optional(),

      column_actions: z.record(z.string(), z.array(z.string())).optional(),
      numeric_columns: z.union([z.array(z.string()), z.string()]).optional(),
      categorical_columns: z.union([z.array(z.string()), z.string()]).optional(),
      executed_steps: z.array(z.string()).optional(),
      config_version: z.string().optional(),
    })
    .optional(),

  // Minimal run stats if you want to include them
  processedRows: z.number().optional(),
  processedColumns: z.number().optional(),
});

export type InsightsRequest = z.infer<typeof InsightsRequestSchema>;
