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

/**
 * Multi-run: builds correlation configs for ALL analyses emitted by Step3CorrelationOrchestrator.
 * Expects `correlationForm.correlationConfigs` which is an array of analysis objects.
 */
export function buildCorrelationConfigsFromForm(correlationForm) {
  const list = Array.isArray(correlationForm?.correlationConfigs) ? correlationForm.correlationConfigs : [];

  const built = list
    .map((a) =>
      buildCorrelationConfig({
        enabled: a?.enabled,
        selectedColumns: a?.columns,
        method: a?.method,
        topK: a?.topK,
        minAbs: a?.minAbs,
        includeMatrix: a?.includeMatrix,
      })
    )
    .filter(Boolean);

  return built.length ? built : null;
}
