// src/lib/buildCorrelationConfig.js

export function buildCorrelationConfig({
  enabled,
  selectedColumns,
  method,
  topK,
  minAbs,
  includeMatrix,
}) {
  if (!enabled) return null;

  const cols = Array.isArray(selectedColumns) ? selectedColumns.filter(Boolean) : [];
  if (cols.length < 2) return null;

  return {
    enabled: true,
    columns: cols,
    method: method || "pearson",
    topK: Number.isFinite(Number(topK)) ? Number(topK) : 10,
    minAbs: Number.isFinite(Number(minAbs)) ? Number(minAbs) : 0.0,
    includeMatrix: includeMatrix !== false,
  };
}
