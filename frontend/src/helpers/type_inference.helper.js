export function inferColumnTypes(rows, columns) {
  const result = {};
  const SAMPLE_N = Math.min(rows.length, 200);

  for (const col of columns) {
    let nonEmpty = 0;
    let numericLike = 0;

    for (let i = 0; i < SAMPLE_N; i++) {
      const v = rows[i]?.[col];
      if (v == null) continue;
      const s = String(v).trim();
      if (!s) continue;

      nonEmpty++;
      const num = Number(s);
      if (!Number.isNaN(num) && s.match(/^-?\d+(\.\d+)?$/)) numericLike++;
    }

    // if most non-empty values look numeric => numeric
    result[col] = nonEmpty > 0 && numericLike / nonEmpty > 0.9 ? 'numeric' : 'categorical';
  }

  return result;
}
