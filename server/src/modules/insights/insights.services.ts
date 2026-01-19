import cfg from "@config/index";
import { InsightsRequestSchema } from "./validation/insightsRequest.schema";
import { InsightsResponseSchema } from "./validation/insightsResponse.schema";
import { buildInsightsContextFromPayload } from "./utils/buildInsightsContext";
import type { InsightsResponse } from "./validation/insightsResponse.schema";

import type { InsightsLLMProvider } from "./llm/provider";
import { OpenAIInsightsProvider } from "./llm/providers/OpenAIProvider";

// Optional: add a MockInsightsProvider similar to your MockProvider pattern
function getProvider(): InsightsLLMProvider {
  const provider = String(cfg.openAI.llmProvider).toLowerCase();
  if (provider === "openai") return new OpenAIInsightsProvider();
  return new OpenAIInsightsProvider(); // fallback to openai unless you implement mock
}

export async function generateInsightsService(params: {
  payload: unknown;
}): Promise<InsightsResponse> {
  const payload = InsightsRequestSchema.parse(params.payload);

  const ctx = buildInsightsContextFromPayload(payload);
  const llm = getProvider();
  const raw = await llm.generateInsights(ctx);

  // Strict validation of final response
  const validated = InsightsResponseSchema.parse(raw);

  return {
    ...validated,
    confidence: Math.max(0, Math.min(1, Number(validated.confidence ?? 0.6))),
    keyFindings: Array.isArray(validated.keyFindings) ? validated.keyFindings : [],
    dataQualityObservations: Array.isArray(validated.dataQualityObservations)
      ? validated.dataQualityObservations
      : [],
    correlationInsights: Array.isArray(validated.correlationInsights) ? validated.correlationInsights : [],
    preprocessingNotes: Array.isArray(validated.preprocessingNotes) ? validated.preprocessingNotes : [],
    recommendedNextSteps: Array.isArray(validated.recommendedNextSteps) ? validated.recommendedNextSteps : [],
    warnings: Array.isArray(validated.warnings) ? validated.warnings : [],
  };
}
