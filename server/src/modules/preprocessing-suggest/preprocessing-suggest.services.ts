import { prisma } from '@loaders/prisma';
import { PreprocessingConfigSchema } from './validation/preprocessingConfig.schema';
import { normalizePreprocessingConfig } from './utils/normalizeConfig';
import { buildDatasetContextFromCsv } from './utils/datasetContext';
import type { SuggestResponse } from './llm/types';
import { MockProvider } from './llm/providers/MockProvider';
import { OpenAIProvider } from './llm/providers/OpenAIProvider';

class ServiceError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function getProvider() {
  const provider = String(process.env.LLM_PROVIDER || 'mock').toLowerCase();
  if (provider === 'openai') return new OpenAIProvider();
  return new MockProvider();
}

export async function suggestPreprocessingService(params: {
  ownerId: string;
  datasetId: string;
  sampleRowCount?: number;
}): Promise<SuggestResponse> {
  const { ownerId, datasetId } = params;
  const sampleRowCount = Math.min(Math.max(params.sampleRowCount ?? 20, 5), 50);

  const dataset = await prisma.dataset.findUnique({
    where: { id: datasetId },
    select: {
      id: true,
      ownerId: true,
      storagePath: true,
      originalName: true,
    },
  });

  if (!dataset) throw new ServiceError('DATASET_NOT_FOUND', 'Dataset not found');
  if (dataset.ownerId !== ownerId) throw new ServiceError('FORBIDDEN', 'Forbidden');

  const ctx = await buildDatasetContextFromCsv({
    datasetId,
    storagePath: dataset.storagePath,
    filename: dataset.originalName,
    sampleRowCount,
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
