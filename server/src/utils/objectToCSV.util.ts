export function objectToCsv(row: Record<string, any>): string {
  if (!row) return '';

  const headers = Object.keys(row);
  const values = headers.map(h => row[h]);

  return `${headers.join(',')}\n${values.join(',')}`;
}
