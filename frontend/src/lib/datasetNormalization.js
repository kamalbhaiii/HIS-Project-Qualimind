// src/lib/datasetNormalization.js

export const asArray = (v) => {
  if (v === null || v === undefined) return [];
  if (Array.isArray(v)) return v;
  // handle {} coming from R empty objects
  if (typeof v === "object") return [];
  return [v];
};

export const asStringArray = (v) =>
  asArray(v).map((x) => (x === null || x === undefined ? "" : String(x))).filter(Boolean);

export const normalizeColumnActions = (columnActions) => {
  if (!columnActions || typeof columnActions !== "object") return {};
  const out = {};
  Object.keys(columnActions).forEach((k) => {
    out[k] = asStringArray(columnActions[k]);
  });
  return out;
};

export const normalizeMetadata = (metadata) => {
  const m = metadata || {};

  return {
    ...m,
    numeric_columns: asStringArray(m.numeric_columns),
    categorical_columns: asStringArray(m.categorical_columns),
    encoded_columns: asStringArray(m.encoded_columns),
    frequency_encoded_columns: asStringArray(m.frequency_encoded_columns),
    executed_steps: asStringArray(m.executed_steps),
    high_cardinality_columns: asStringArray(m.high_cardinality_columns),
    column_actions: normalizeColumnActions(m.column_actions),
    correlation: m.correlation || null,
    scaling_stats: m.scaling_stats || null,
    encoding_stats: m.encoding_stats || null,
  };
};
