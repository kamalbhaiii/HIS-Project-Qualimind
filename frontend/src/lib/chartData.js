// src/lib/chartData.js

export const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export const isMissing = (v) => v === null || v === undefined || v === "";

/* ------------------------- column detection ------------------------- */

export const getNumericColumnsFromRows = (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const cols = Object.keys(rows[0] || {});
  return cols.filter((c) => rows.some((r) => toNumber(r?.[c]) !== null));
};

export const getCategoricalColumnsFromRows = (rows, maxUnique = 50) => {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const cols = Object.keys(rows[0] || {});
  return cols.filter((c) => {
    const vals = rows.map((r) => r?.[c]).filter((x) => !isMissing(x));
    if (vals.length === 0) return false;
    const numericLike = vals.filter((v) => toNumber(v) !== null).length / vals.length;
    if (numericLike > 0.9) return false;
    const uniq = new Set(vals.map(String));
    return uniq.size <= maxUnique;
  });
};

/* ------------------------- distributions ------------------------- */

export const buildHistogram = (rows, col, bins = 8) => {
  const values = (rows || []).map((r) => toNumber(r?.[col])).filter((n) => n !== null);
  if (values.length < 2) return [];

  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return [{ bin: `${min}`, count: values.length }];

  const width = (max - min) / bins;
  const counts = Array.from({ length: bins }, () => 0);

  values.forEach((v) => {
    const idx = Math.min(bins - 1, Math.floor((v - min) / width));
    counts[idx] += 1;
  });

  return counts.map((count, i) => {
    const start = min + i * width;
    const end = start + width;
    return { bin: `${start.toFixed(2)}–${end.toFixed(2)}`, count };
  });
};

// Important: EBar expects {label,value}. Keep backward compat with {name,count}.
export const buildCategoryCounts = (rows, col, topN = 12) => {
  const map = new Map();
  (rows || []).forEach((r) => {
    const v = r?.[col];
    const key = isMissing(v) ? "(missing)" : String(v);
    map.set(key, (map.get(key) || 0) + 1);
  });

  const arr = Array.from(map.entries())
    .map(([name, count]) => ({ name, count, label: name, value: count }))
    .sort((a, b) => (b.count || 0) - (a.count || 0));

  if (arr.length <= topN) return arr;

  const head = arr.slice(0, topN - 1);
  const rest = arr.slice(topN - 1).reduce((sum, x) => sum + (x.count || 0), 0);
  return [...head, { name: "other", count: rest, label: "other", value: rest }];
};

export const buildScatter = (rows, xCol, yCol, limit = 300) => {
  const pts = [];
  for (let i = 0; i < (rows || []).length && pts.length < limit; i += 1) {
    const x = toNumber(rows[i]?.[xCol]);
    const y = toNumber(rows[i]?.[yCol]);
    if (x === null || y === null) continue;
    pts.push({ x, y });
  }
  return pts;
};

/* ------------------------- missingness ------------------------- */

export const buildMissingnessByColumn = (rows, columns) => {
  const cols = columns || (rows?.[0] ? Object.keys(rows[0]) : []);
  const n = Array.isArray(rows) ? rows.length : 0;
  if (!n || !cols.length) return [];

  return cols.map((c) => {
    let miss = 0;
    for (let i = 0; i < n; i += 1) {
      if (isMissing(rows[i]?.[c])) miss += 1;
    }
    return {
      col: c,
      missing: miss,
      present: n - miss,
      missingPct: n ? miss / n : 0,
      presentPct: n ? (n - miss) / n : 0,
    };
  });
};

/* ------------------------- numeric stats ------------------------- */

function quantile(sorted, q) {
  const n = sorted.length;
  if (!n) return null;
  const pos = (n - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const a = sorted[base];
  const b = sorted[Math.min(n - 1, base + 1)];
  return a + rest * (b - a);
}

export const buildNumericSummary = (rows, col) => {
  const values = (rows || []).map((r) => toNumber(r?.[col])).filter((x) => x !== null);
  const n = values.length;
  if (!n) return null;

  values.sort((a, b) => a - b);
  const min = values[0];
  const max = values[n - 1];
  const mean = values.reduce((s, x) => s + x, 0) / n;
  const median = quantile(values, 0.5);

  let sd = 0;
  if (n >= 2) {
    const varSum = values.reduce((s, x) => s + (x - mean) * (x - mean), 0);
    sd = Math.sqrt(varSum / (n - 1));
  }

  const q1 = quantile(values, 0.25);
  const q3 = quantile(values, 0.75);

  return { n, min, max, mean, median, sd, q1, q3 };
};

export const buildBoxplotSeries = (rows, columns) => {
  const cols = (columns || []).filter(Boolean);
  const data = [];
  const labels = [];

  cols.forEach((c) => {
    const s = buildNumericSummary(rows, c);
    if (!s) return;
    labels.push(c);
    // echarts: [min, q1, median, q3, max]
    data.push([s.min, s.q1, s.median, s.q3, s.max]);
  });

  return { labels, data };
};

export const buildECDF = (rows, col, maxPoints = 200) => {
  const values = (rows || []).map((r) => toNumber(r?.[col])).filter((x) => x !== null);
  const n = values.length;
  if (n < 2) return [];

  values.sort((a, b) => a - b);

  const step = Math.max(1, Math.floor(n / maxPoints));
  const out = [];
  for (let i = 0; i < n; i += step) {
    out.push({ x: values[i], y: (i + 1) / n });
  }
  out.push({ x: values[n - 1], y: 1 });
  return out;
};
