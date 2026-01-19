import type { LLMProvider } from '../provider';
import type { DatasetContext, SuggestResponse } from '../types';
import { PreprocessingConfigSchema } from '../../validation/preprocessingConfig.schema';

export class MockProvider implements LLMProvider {
  async suggestPreprocessing(ctx: DatasetContext): Promise<SuggestResponse> {
    const hasCategorical = ctx.columns.some((c) => c.inferredType === 'categorical');
    const hasNumeric = ctx.columns.some((c) => c.inferredType === 'numeric');

    const steps: any[] = [];

    // Simple, sensible defaults (aligned with your R engine)
    if (hasCategorical) {
      steps.push({
        task: 'label_cleaning',
        method: 'standard',
        appliesTo: { types: ['categorical'] },
      });

      steps.push({
        task: 'encoding',
        method: 'auto',
        params: { one_hot_max_levels: 8 },
        appliesTo: { types: ['categorical'] },
      });
    }

    if (hasNumeric) {
      steps.push({
        task: 'scaling',
        method: 'minmax',
        appliesTo: { types: ['numeric'] },
      });
    }

    // Always return a valid config
    const preprocessingConfig = PreprocessingConfigSchema.parse({
      version: '1.0',
      steps,
    });

    const rationale: string[] = [];
    if (hasCategorical) {
      rationale.push('Clean categorical labels to standardize casing and whitespace.');
      rationale.push(
        'Encode categoricals using one-hot for low-cardinality columns; otherwise use label/frequency encoding.'
      );
    }
    if (hasNumeric) {
      rationale.push('Scale numeric columns using min-max scaling to normalize ranges.');
    }

    // Warn if numeric-like strings exist
    const warnings: string[] = [];
    const suspicious = ctx.columns.filter(
      (c) =>
        c.inferredType !== 'numeric' &&
        c.sampleValues.some((v) => typeof v === 'string' && /^[\[\("']*\d+(\.\d+)?[\]\)"']*$/.test(v))
    );
    if (suspicious.length > 0) {
      warnings.push(
        `Some columns look numeric-like but may be stored as strings: ${suspicious
          .map((c) => c.name)
          .join(', ')}. Consider adding type_inference.`
      );
    }

    return {
      preprocessingConfig,
      rationale,
      confidence: 0.75,
      warnings,
    };
  }
}
