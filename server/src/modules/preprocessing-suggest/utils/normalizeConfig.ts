import type { PreprocessingConfig } from '../validation/preprocessingConfig.schema';

const TASK_ALIASES: Record<string, string> = {
  // canonical
  label_cleaning: 'label_cleaning',
  encoding: 'encoding',
  scaling: 'scaling',
  type_inference: 'type_inference',

  // common aliases
  clean_labels: 'label_cleaning',
  clean_category_labels: 'label_cleaning',
  encode: 'encoding',
  encode_categoricals: 'encoding',
  scale_numeric: 'scaling',
  numeric_scaling: 'scaling',
};

const METHOD_ALIASES: Record<string, string> = {
  standard: 'standard',
  auto: 'auto',
  minmax: 'minmax',
  zscore: 'zscore',
  standardization: 'zscore',
};

export function normalizePreprocessingConfig(cfg: PreprocessingConfig): PreprocessingConfig {
  return {
    ...cfg,
    steps: cfg.steps.map((s) => {
      const taskRaw = String(s.task || '').trim().toLowerCase();
      const methodRaw = String(s.method || '').trim().toLowerCase();

      return {
        ...s,
        task: TASK_ALIASES[taskRaw] || taskRaw,
        method: METHOD_ALIASES[methodRaw] || methodRaw,
      };
    }),
  };
}
