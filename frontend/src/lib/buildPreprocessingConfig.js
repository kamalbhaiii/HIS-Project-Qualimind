// components/utils/buildPreprocessingConfig.js
// NEW BEHAVIOR (Round-2):
// Build preprocessingConfig ONLY from explicit per-column overrides.
// No type-level defaults. No implicit steps.
// If overrides are empty => caller should treat as "no preprocessing".

export function buildPreprocessingConfig({ columns, columnTypes, overrides }) {
  const steps = [];
  const cols = Array.isArray(columns) ? columns : [];
  const ov = overrides || {};

  const pushColumnStep = (task, method, col, params) => {
    steps.push({
      task,
      method,
      appliesTo: { columns: [col] },
      ...(params ? { params } : {}),
    });
  };

  const isCat = (t) => String(t || "").toLowerCase() === "categorical";
  const isNum = (t) => String(t || "").toLowerCase() === "numeric";

  for (const col of cols) {
    const type = columnTypes?.[col];
    const c = ov?.[col];
    if (!c || typeof c !== "object") continue;

    // ---- missing_values ----
    // schema:
    // overrides[col].missing_values = {
    //   categorical: { method: 'categorical_unknown'|'categorical_mode', unknownLevel? },
    //   numeric: { method: 'numeric_median'|'numeric_mean'|'numeric_constant', value? }
    // }
    if (c.missing_values?.categorical && isCat(type)) {
      const m = c.missing_values.categorical.method;
      if (m) {
        const params =
          m === "categorical_unknown"
            ? { unknownLevel: c.missing_values.categorical.unknownLevel ?? "unknown" }
            : undefined;
        pushColumnStep("missing_values", m, col, params);
      }
    }

    if (c.missing_values?.numeric && isNum(type)) {
      const m = c.missing_values.numeric.method;
      if (m) {
        const params = m === "numeric_constant" ? { value: Number(c.missing_values.numeric.value ?? 0) } : undefined;
        pushColumnStep("missing_values", m, col, params);
      }
    }

    // ---- label_cleaning ----
    // overrides[col].label_cleaning = { method: 'standard' }
    if (c.label_cleaning?.method && isCat(type)) {
      pushColumnStep("label_cleaning", c.label_cleaning.method, col);
    }

    // ---- reduce_cardinality ----
    // overrides[col].reduce_cardinality = { method:'rare_to_other', rare_prop_threshold, high_cardinality_threshold }
    if (c.reduce_cardinality?.method && isCat(type)) {
      pushColumnStep("reduce_cardinality", c.reduce_cardinality.method, col, {
        rare_prop_threshold: Number(c.reduce_cardinality.rare_prop_threshold ?? 0.01),
        high_cardinality_threshold: Number(c.reduce_cardinality.high_cardinality_threshold ?? 50),
      });
    }

    // ---- encoding ----
    // overrides[col].encoding = { method:'auto', one_hot_max_levels }
    if (c.encoding?.method && isCat(type)) {
      pushColumnStep("encoding", c.encoding.method, col, {
        one_hot_max_levels: Number(c.encoding.one_hot_max_levels ?? 10),
      });
    }

    // ---- scaling ----
    // overrides[col].scaling = { method:'zscore'|'minmax'|'none' }
    if (c.scaling?.method && isNum(type)) {
      pushColumnStep("scaling", c.scaling.method, col);
    }
  }

  return { version: "1.0", steps };
}
