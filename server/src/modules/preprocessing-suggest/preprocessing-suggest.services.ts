import { PreprocessingConfigSchema } from "./validation/preprocessingConfig.schema";
import { normalizePreprocessingConfig } from "./utils/normalizeConfig";
import type { SuggestResponse } from "./llm/types";
import { MockProvider } from "./llm/providers/MockProvider";
import { OpenAIProvider } from "./llm/providers/OpenAIProvider";
import cfg from "@config/index";
import { buildDatasetContextFromPayload } from "./utils/datasetContext";
import type { SuggestPreprocessingRequest } from "./validation/suggestRequest.schema";

function getProvider() {
  const provider = String(cfg.openAI.llmProvider).toLowerCase();
  if (provider === "openai") return new OpenAIProvider();
  return new MockProvider();
}

export async function suggestPreprocessingService(params: {
  payload: SuggestPreprocessingRequest;
}): Promise<SuggestResponse> {
  const { payload } = params;

  // Build ctx from provided sample + metadata
  const ctx = buildDatasetContextFromPayload({
    filename: payload.filename,
    columns: payload.columns,
    sampleRows: payload.sampleRows,
    sampleRowCount: payload.sampleRowCount,
  });

  const llm = getProvider();
  const raw = await llm.suggestPreprocessing(ctx);

  // Validate structure strictly
  const validatedConfig = PreprocessingConfigSchema.parse(raw.preprocessingConfig);

  // Normalize aliases
  const normalizedConfig = normalizePreprocessingConfig(validatedConfig);

  return {
    ...raw,
    preprocessingConfig: normalizedConfig,
    confidence: Math.max(0, Math.min(1, Number(raw.confidence ?? 0.5))),
    rationale: Array.isArray(raw.rationale) ? raw.rationale : [],
    warnings: Array.isArray(raw.warnings) ? raw.warnings : [],
  };
}
