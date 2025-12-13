export function parseJsonField(input: unknown): any | null {
  if (!input) return null;
  if (typeof input === 'object') return input; // already parsed by some middleware (rare)
  const s = String(input).trim();
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

type PreprocessingConfig = {
  version?: string;
  steps: Array<{
    task: string;
    method: string;
    appliesTo?: { columns?: string[]; types?: Array<'numeric'|'categorical'> };
    params?: Record<string, any>;
  }>;
};

export function validatePreprocessingConfig(cfg: any): { ok: true; value: PreprocessingConfig } | { ok: false; error: string } {
  if (!cfg || typeof cfg !== 'object') return { ok: false, error: 'preprocessingConfig must be a JSON object' };
  if (!Array.isArray(cfg.steps)) return { ok: false, error: 'preprocessingConfig.steps must be an array' };

  for (let i = 0; i < cfg.steps.length; i++) {
    const st = cfg.steps[i];
    if (!st || typeof st !== 'object') return { ok: false, error: `steps[${i}] must be an object` };
    if (!st.task || typeof st.task !== 'string') return { ok: false, error: `steps[${i}].task must be a string` };
    if (!st.method || typeof st.method !== 'string') return { ok: false, error: `steps[${i}].method must be a string` };

    if (st.appliesTo) {
      const a = st.appliesTo;
      if (typeof a !== 'object') return { ok: false, error: `steps[${i}].appliesTo must be an object` };
      if (a.columns && !Array.isArray(a.columns)) return { ok: false, error: `steps[${i}].appliesTo.columns must be an array` };
      if (a.types && !Array.isArray(a.types)) return { ok: false, error: `steps[${i}].appliesTo.types must be an array` };
    }
  }

  return { ok: true, value: cfg as PreprocessingConfig };
}

export function normalizePreprocessingTasks(input: unknown): string[] {
  if (!input) return [];

  if (Array.isArray(input)) {
    // support multiple values or comma-separated entries
    return input
      .flatMap(v => String(v).split(','))
      .map(s => s.trim())
      .filter(Boolean);
  }

  return String(input)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}