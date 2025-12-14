import type { DatasetContext, SuggestResponse } from './types';

export interface LLMProvider {
  suggestPreprocessing(ctx: DatasetContext): Promise<SuggestResponse>;
}
