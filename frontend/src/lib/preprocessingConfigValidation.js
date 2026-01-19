export function validatePreprocessingConfig(cfg) {
  if (!cfg || typeof cfg !== 'object') return { ok: false, message: 'Missing preprocessingConfig' };
  if (cfg.version !== '1.0') return { ok: false, message: 'preprocessingConfig.version must be "1.0"' };
  if (!Array.isArray(cfg.steps)) return { ok: false, message: 'preprocessingConfig.steps must be an array' };

  for (let i = 0; i < cfg.steps.length; i++) {
    const s = cfg.steps[i];
    if (!s || typeof s !== 'object') return { ok: false, message: `steps[${i}] must be an object` };
    if (!s.task || typeof s.task !== 'string') return { ok: false, message: `steps[${i}].task is required` };
    if (!s.method || typeof s.method !== 'string') return { ok: false, message: `steps[${i}].method is required` };
    if (!s.appliesTo || typeof s.appliesTo !== 'object') return { ok: false, message: `steps[${i}].appliesTo is required` };

    const hasTypes = Array.isArray(s.appliesTo.types) && s.appliesTo.types.length > 0;
    const hasColumns = Array.isArray(s.appliesTo.columns) && s.appliesTo.columns.length > 0;
    if (!hasTypes && !hasColumns) {
      return { ok: false, message: `steps[${i}].appliesTo must include types or columns` };
    }
  }

  return { ok: true };
}
