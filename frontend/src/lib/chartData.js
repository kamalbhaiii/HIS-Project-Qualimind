// src/lib/chartData.js

export const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export const getNumericColumnsFromRows = (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const cols = Object.keys(rows[0] || {});
  return cols.filter((c) => rows.some((r) => toNumber(r?.[c]) !== null));
};

export const getCategoricalColumnsFromRows = (rows, maxUnique = 50) => {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const cols = Object.keys(rows[0] || {});
  return cols.filter((c) => {
    const vals = rows.map((r) => r?.[c]).filter((x) => x !== null && x !== undefined && x !== "");
    if (vals.length === 0) return false;
    // reject columns that look numeric
    const numericLike = vals.filter((v) => toNumber(v) !== null).length / vals.length;
    if (numericLike > 0.9) return false;
    const uniq = new Set(vals.map(String));
    return uniq.size <= maxUnique;
  });
};

export const buildHistogram = (rows, col, bins = 8) => {
  const values = rows.map((r) => toNumber(r?.[col])).filter((n) => n !== null);
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

export const buildCategoryCounts = (rows, col, topN = 12) => {
  const map = new Map();
  rows.forEach((r) => {
    const v = r?.[col];
    const key = (v === null || v === undefined || v === "") ? "(missing)" : String(v);
    map.set(key, (map.get(key) || 0) + 1);
  });

  const arr = Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  if (arr.length <= topN) return arr;

  const head = arr.slice(0, topN - 1);
  const rest = arr.slice(topN - 1).reduce((sum, x) => sum + x.count, 0);
  return [...head, { name: "other", count: rest }];
};

export const buildScatter = (rows, xCol, yCol, limit = 300) => {
  const pts = [];
  for (let i = 0; i < rows.length && pts.length < limit; i += 1) {
    const x = toNumber(rows[i]?.[xCol]);
    const y = toNumber(rows[i]?.[yCol]);
    if (x === null || y === null) continue;
    pts.push({ x, y });
  }
  return pts;
};
