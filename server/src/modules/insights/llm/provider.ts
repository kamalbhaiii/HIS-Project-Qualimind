import type { InsightsContext, GenerateInsightsResponse } from "./types";

export interface InsightsLLMProvider {
  generateInsights(ctx: InsightsContext): Promise<GenerateInsightsResponse>;
}
