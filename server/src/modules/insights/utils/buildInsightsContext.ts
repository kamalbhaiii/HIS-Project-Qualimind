import type { InsightsRequest } from "../validation/insightsRequest.schema";
import type { InsightsContext } from "../llm/types";

function takeFirstLines(s: string, maxLines: number): string {
  const lines = s.split(/\r?\n/);
  return lines.slice(0, maxLines).join("\n");
}

export function buildInsightsContextFromPayload(payload: InsightsRequest): InsightsContext {
  const rawSample =
    typeof payload.rawData === "string" && payload.rawData.trim()
      ? takeFirstLines(payload.rawData, 12)
      : undefined;

  const processedSample =
    typeof payload.processedData === "string" && payload.processedData.trim()
      ? takeFirstLines(payload.processedData, 12)
      : undefined;

  // Keep “metadata” as-is but it should already be bounded in size.
  // If you later observe bloat, we can whitelist only the keys you care about.
  const metadata = payload.metadata ? payload.metadata : undefined;

  return {
    filename: payload.filename,
    rawSample,
    processedSample,
    processedRows: payload.processedRows,
    processedColumns: payload.processedColumns,
    metadata,
  };
}
