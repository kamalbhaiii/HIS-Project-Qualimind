import type { DatasetContext, DatasetColumnProfile } from "../llm/types";

function clampInt(n: unknown, min: number, max: number, fallback: number) {
  const x = Number(n);
  if (!Number.isFinite(x)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(x)));
}

export function buildDatasetContextFromPayload(params: {
  filename?: string;
  columns: DatasetColumnProfile[];
  sampleRows: Record<string, any>[];
  sampleRowCount?: number;
}): DatasetContext {
  const sampleRows = Array.isArray(params.sampleRows) ? params.sampleRows : [];
  const maxRows = 200; // hard cap to control token/cost; adjust if desired
  const cappedRows = sampleRows.slice(0, maxRows);

  const sampleRowCount =
    params.sampleRowCount != null
      ? clampInt(params.sampleRowCount, 1, maxRows, cappedRows.length || 1)
      : (cappedRows.length || 1);

  return {
    filename: params.filename,
    columns: params.columns,
    sampleRows: cappedRows,
    sampleRowCount,
  };
}
