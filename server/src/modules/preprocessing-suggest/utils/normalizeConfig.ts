// server/modules/preprocessing-suggest/utils/normalizeConfig.ts

import type { PreprocessingConfig, PreprocessingStep } from "../validation/preprocessingConfig.schema";

/**
 * Canonical param keys expected by the R-engine config contract (aligned to your LLM schema).
 * Values are strings; use "" when not applicable.
 */
const CANONICAL_PARAM_KEYS = [
  "one_hot_max_levels",
  "rare_prop_threshold",
  "high_cardinality_threshold",
  "strategy",
  "fill_value",
  "clip_min",
  "clip_max",
  "zscore_center",
  "zscore_scale",
  "minmax_min",
  "minmax_max",
] as const;

type CanonicalParamKey = (typeof CANONICAL_PARAM_KEYS)[number];
type CanonicalParams = Record<CanonicalParamKey, string>;

const TASK_ALIASES: Record<string, string> = {
  // canonical
  missing_values: "missing_values",
  label_cleaning: "label_cleaning",
  reduce_cardinality: "reduce_cardinality",
  encoding: "encoding",
  scaling: "scaling",
  type_inference: "type_inference",

  // common aliases (UI + LLM variants)
  impute: "missing_values",
  imputation: "missing_values",
  handle_missing: "missing_values",
  handle_missing_values: "missing_values",
  handle_missing_categoricals: "missing_values",
  numeric_imputation: "missing_values",

  clean_labels: "label_cleaning",
  clean_category_labels: "label_cleaning",
  standardize_labels: "label_cleaning",

  reduce_card: "reduce_cardinality",
  cardinality_reduction: "reduce_cardinality",

  encode: "encoding",
  encode_categoricals: "encoding",

  scale_numeric: "scaling",
  numeric_scaling: "scaling",
};

const METHOD_ALIASES: Record<string, string> = {
  // existing canonical
  standard: "standard",
  auto: "auto",
  minmax: "minmax",
  zscore: "zscore",
  none: "none",

  categorical_unknown: "categorical_unknown",
  categorical_mode: "categorical_mode",
  numeric_median: "numeric_median",
  numeric_mean: "numeric_mean",
  numeric_constant: "numeric_constant",

  rare_to_other: "rare_to_other",

  // defensive mappings (LLM drift)
  mean: "numeric_mean",
  median: "numeric_median",
  most_frequent: "categorical_mode",
  mode: "categorical_mode",
  one_hot: "auto"
};


function toKey(x: unknown): string {
  return String(x ?? "").trim().toLowerCase();
}

function toStr(x: unknown): string {
  if (x === null || x === undefined) return "";
  if (typeof x === "string") return x;
  if (typeof x === "number") return Number.isFinite(x) ? String(x) : "";
  if (typeof x === "boolean") return x ? "true" : "false";
  try {
    return String(x);
  } catch {
    return "";
  }
}

/**
 * Create an empty canonical params object.
 */
function emptyCanonicalParams(): CanonicalParams {
  return CANONICAL_PARAM_KEYS.reduce((acc, k) => {
    acc[k] = "";
    return acc;
  }, {} as CanonicalParams);
}

/**
 * Coerce any incoming params object into canonical string-keyed params,
 * mapping legacy/UI keys to canonical keys where possible.
 */
function coerceParams(input: any): CanonicalParams {
  const out = emptyCanonicalParams();
  if (!input || typeof input !== "object") return out;

  // Copy canonical keys if present
  for (const k of CANONICAL_PARAM_KEYS) {
    if (Object.prototype.hasOwnProperty.call(input, k)) {
      out[k] = toStr(input[k]);
    }
  }

  // Map common legacy/UI keys -> canonical
  // Encoding
  if (!out.one_hot_max_levels) {
    const legacy = input.oneHotMaxLevels ?? input.one_hot_max_levels ?? input.one_hot_max_level;
    if (legacy !== undefined) out.one_hot_max_levels = toStr(legacy);
  }

  // Cardinality thresholds
  if (!out.rare_prop_threshold) {
    const legacy = input.rarePropThreshold ?? input.rare_prop_threshold;
    if (legacy !== undefined) out.rare_prop_threshold = toStr(legacy);
  }
  if (!out.high_cardinality_threshold) {
    const legacy = input.highCardinalityThreshold ?? input.high_cardinality_threshold;
    if (legacy !== undefined) out.high_cardinality_threshold = toStr(legacy);
  }

  // Missing-value legacy keys
  if (!out.fill_value) {
    const legacy = input.fill_value ?? input.unknownLevel ?? input.unknown_level ?? input.value;
    if (legacy !== undefined) out.fill_value = toStr(legacy);
  }
  if (!out.strategy) {
    const legacy = input.strategy;
    if (legacy !== undefined) out.strategy = toStr(legacy);
  }

  // Scaling legacy keys (rare but safe)
  if (!out.zscore_center && input.center !== undefined) out.zscore_center = toStr(input.center);
  if (!out.zscore_scale && input.scale !== undefined) out.zscore_scale = toStr(input.scale);
  if (!out.minmax_min && input.min !== undefined) out.minmax_min = toStr(input.min);
  if (!out.minmax_max && input.max !== undefined) out.minmax_max = toStr(input.max);

  // Clipping
  if (!out.clip_min && input.clipMin !== undefined) out.clip_min = toStr(input.clipMin);
  if (!out.clip_max && input.clipMax !== undefined) out.clip_max = toStr(input.clipMax);

  return out;
}

/**
 * Task/method-specific defaults to ensure execution-ready config.
 * Everything remains strings; use "" if not applicable.
 */
function applyTaskMethodDefaults(task: string, method: string, params: CanonicalParams): CanonicalParams {
  const p = { ...params };

  // -------- missing_values --------
  if (task === "missing_values") {
    // normalize strategy/fill_value based on method
    switch (method) {
      case "categorical_unknown": {
        // constant fill for categoricals
        if (!p.strategy) p.strategy = "constant";
        if (!p.fill_value) p.fill_value = "unknown";
        break;
      }
      case "categorical_mode": {
        if (!p.strategy) p.strategy = "mode";
        // fill_value not needed
        break;
      }
      case "numeric_median": {
        if (!p.strategy) p.strategy = "median";
        break;
      }
      case "numeric_mean": {
        if (!p.strategy) p.strategy = "mean";
        break;
      }
      case "numeric_constant": {
        if (!p.strategy) p.strategy = "constant";
        if (!p.fill_value) p.fill_value = "0";
        break;
      }
      default: {
        // If method is unknown but task is missing_values, at least keep a safe strategy
        if (!p.strategy) p.strategy = "median";
        break;
      }
    }

    // Missing-values step does not need encoding/scaling/cardinality params
    p.one_hot_max_levels = "";
    p.rare_prop_threshold = "";
    p.high_cardinality_threshold = "";
    p.zscore_center = "";
    p.zscore_scale = "";
    p.minmax_min = "";
    p.minmax_max = "";
    p.clip_min = p.clip_min || "";
    p.clip_max = p.clip_max || "";

    return p;
  }

  // -------- label_cleaning --------
  if (task === "label_cleaning") {
    // no params required
    return emptyCanonicalParams();
  }

  // -------- reduce_cardinality --------
  if (task === "reduce_cardinality") {
    if (!p.rare_prop_threshold) p.rare_prop_threshold = "0.01";
    if (!p.high_cardinality_threshold) p.high_cardinality_threshold = "50";

    // Not relevant here
    p.one_hot_max_levels = "";
    p.strategy = "";
    p.fill_value = "";
    p.clip_min = "";
    p.clip_max = "";
    p.zscore_center = "";
    p.zscore_scale = "";
    p.minmax_min = "";
    p.minmax_max = "";
    return p;
  }

  // -------- encoding --------
  if (task === "encoding") {
    if (!p.one_hot_max_levels) p.one_hot_max_levels = "10";

    // Not relevant here
    p.rare_prop_threshold = "";
    p.high_cardinality_threshold = "";
    p.strategy = "";
    p.fill_value = "";
    p.clip_min = "";
    p.clip_max = "";
    p.zscore_center = "";
    p.zscore_scale = "";
    p.minmax_min = "";
    p.minmax_max = "";
    return p;
  }

  // -------- scaling --------
  if (task === "scaling") {
    if (method === "zscore") {
      if (!p.zscore_center) p.zscore_center = "true";
      if (!p.zscore_scale) p.zscore_scale = "true";
      // Not relevant
      p.minmax_min = "";
      p.minmax_max = "";
    } else if (method === "minmax") {
      if (!p.minmax_min) p.minmax_min = "0";
      if (!p.minmax_max) p.minmax_max = "1";
      // Not relevant
      p.zscore_center = "";
      p.zscore_scale = "";
    } else if (method === "none") {
      // No scaling; clear scaling params
      p.zscore_center = "";
      p.zscore_scale = "";
      p.minmax_min = "";
      p.minmax_max = "";
    }

    // Not relevant here
    p.one_hot_max_levels = "";
    p.rare_prop_threshold = "";
    p.high_cardinality_threshold = "";
    p.strategy = "";
    p.fill_value = "";
    p.clip_min = "";
    p.clip_max = "";
    return p;
  }

  // Default: keep canonical keys, but do not invent task-specific defaults
  return p;
}

/**
 * Ensure appliesTo has both arrays present (your LLM schema requires it; UI may not).
 */
function normalizeAppliesTo(appliesTo: any): { types: string[]; columns: string[] } {
  const types = Array.isArray(appliesTo?.types) ? appliesTo.types.filter(Boolean).map(String) : [];
  const columns = Array.isArray(appliesTo?.columns) ? appliesTo.columns.filter(Boolean).map(String) : [];
  return { types, columns };
}

/**
 * Optionally drop empty-string params entirely for tasks where you do not want params.
 * If your downstream expects `params` always present, keep it always.
 *
 * Here we keep `params` ALWAYS present to match your LLM schema and to simplify execution.
 */
function normalizeStep(step: PreprocessingStep): PreprocessingStep {
  const taskRaw = toKey(step.task);
  const methodRaw = toKey(step.method);

  const task = TASK_ALIASES[taskRaw] || taskRaw;
  const method = METHOD_ALIASES[methodRaw] || methodRaw;

  const appliesTo = normalizeAppliesTo((step as any).appliesTo);

  // Coerce and default params into canonical keys
  const coerced = coerceParams((step as any).params);
  const params = applyTaskMethodDefaults(task, method, coerced);

  return {
    ...step,
    task,
    method,
    appliesTo: appliesTo as any,
    params: params as any,
  };
}

export function normalizePreprocessingConfig(cfg: PreprocessingConfig): PreprocessingConfig {
  return {
    ...cfg,
    steps: Array.isArray(cfg.steps) ? cfg.steps.map(normalizeStep) : [],
  };
}
