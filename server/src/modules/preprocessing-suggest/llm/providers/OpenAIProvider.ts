import type { LLMProvider } from '../provider';
import type { DatasetContext, SuggestResponse } from '../types';

export class OpenAIProvider implements LLMProvider {
  async suggestPreprocessing(_ctx: DatasetContext): Promise<SuggestResponse> {
    throw new Error('OpenAI provider not enabled in this ticket (use MockProvider)');
  }
}
