import { z } from 'zod';

const AppliesToSchema = z
  .object({
    types: z.array(z.enum(['categorical', 'numeric'])).optional(),
    columns: z.array(z.string().min(1)).optional(),
  })
  .refine((v) => (v.types && v.types.length > 0) || (v.columns && v.columns.length > 0), {
    message: 'appliesTo must include at least one of: types or columns',
  });

export const PreprocessingStepSchema = z.object({
  task: z.string().min(1),
  method: z.string().min(1),
  appliesTo: AppliesToSchema,
  params: z.record(z.string(), z.any()).optional(),
});

export const PreprocessingConfigSchema = z.object({
  version: z.literal('1.0'),
  steps: z.array(PreprocessingStepSchema),
});

export type PreprocessingConfig = z.infer<typeof PreprocessingConfigSchema>;
export type PreprocessingStep = z.infer<typeof PreprocessingStepSchema>;
