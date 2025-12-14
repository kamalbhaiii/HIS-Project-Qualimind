import type { PreprocessingConfig } from "../validation/preprocessingConfig.schema";

export interface DatasetColumnProfile {
  name: string;
  inferredType: "categorical" | "numeric" | "unknown";
  missingCount: number;
  uniqueCount: number;
  sampleValues: string[];
}

export interface DatasetContext {
  // datasetId removed: microservice should not depend on persisted dataset identity
  filename?: string;
  sampleRowCount: number;
  columns: DatasetColumnProfile[];
  sampleRows: Record<string, any>[];
}

export interface SuggestResponse {
  preprocessingConfig: PreprocessingConfig;
  rationale: string[];
  confidence: number; // 0..1
  warnings: string[];
}
