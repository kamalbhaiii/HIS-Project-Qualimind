// src/lib/parseCsvPreview.js

const stripQuotes = (s) => {
  const str = String(s ?? "").trim();
  if (str.startsWith('"') && str.endsWith('"')) return str.slice(1, -1);
  return str;
};

// Not a full RFC parser, but handles your current output reliably
export const parseCsvPreview = (csvString, maxRows = 100) => {
  if (!csvString) return { columns: [], rows: [] };

  const lines = csvString.trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) return { columns: [], rows: [] };

  const rawCols = lines[0].split(",").map(stripQuotes);
  const columns = rawCols.map((c) => c.trim()).filter(Boolean);

  const rows = lines
    .slice(1, 1 + maxRows)
    .map((line) => {
      const values = line.split(",");
      const row = {};
      columns.forEach((col, idx) => {
        row[col] = stripQuotes(values[idx] ?? "");
      });
      return row;
    });

  return { columns, rows };
};
