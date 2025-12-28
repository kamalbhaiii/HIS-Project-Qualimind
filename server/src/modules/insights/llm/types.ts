import type { InsightsResponse } from "../validation/insightsResponse.schema";

export interface InsightsContext {
  filename?: string;

  // Keep payload compact; cap rows
  rawSample?: string;        // short CSV snippet or first N lines
  processedSample?: string;  // short CSV snippet or first N lines

  processedRows?: number;
  processedColumns?: number;

  metadata?: Record<string, any>;
}

export type GenerateInsightsResponse = InsightsResponse;
