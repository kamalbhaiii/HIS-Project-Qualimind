import fs from 'fs/promises';
import { parse } from 'csv-parse/sync';
import type { DatasetContext, DatasetColumnProfile } from '../llm/types';

function normalizeCell(v: any): string {
  if (v == null) return '';
  return String(v);
}

function looksNumeric(s: string): boolean {
  // handle values like ["10"] as well
  const trimmed = s.trim();
  const cleaned = trimmed.replace(/^\[\s*"?|"?\s*\]$/g, '').trim();
  return /^-?\d+(\.\d+)?$/.test(cleaned);
}

export async function buildDatasetContextFromCsv(params: {
  datasetId: string;
  storagePath: string;
  filename?: string;
  sampleRowCount: number;
}): Promise<DatasetContext> {
  const { datasetId, storagePath, filename, sampleRowCount } = params;

  const csvContent = await fs.readFile(storagePath, 'utf-8');

  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  }) as Record<string, any>[];

  const sampleRows = records.slice(0, sampleRowCount);

  const colNames = sampleRows.length
    ? Object.keys(sampleRows[0])
    : // fallback: parse header only
      Object.keys((records[0] ?? {}) as any);

  const columns: DatasetColumnProfile[] = colNames.map((name) => {
    const values = sampleRows.map((r) => normalizeCell(r[name]));
    const missingTokens = new Set(['', 'NA', 'N/A', 'null', 'NULL', 'NaN', 'nan', '?']);
    const missingCount = values.filter((v) => missingTokens.has(v.trim())).length;

    const nonMissing = values.filter((v) => !missingTokens.has(v.trim()));
    const uniqueCount = new Set(nonMissing.map((v) => v.trim())).size;

    const numericLikeCount = nonMissing.filter(looksNumeric).length;
    const ratio = nonMissing.length ? numericLikeCount / nonMissing.length : 0;

    const inferredType: 'categorical' | 'numeric' | 'unknown' =
      nonMissing.length === 0 ? 'unknown' : ratio >= 0.9 ? 'numeric' : 'categorical';

    const sampleValues = Array.from(new Set(values.map((v) => v.trim()))).slice(0, 5);

    return {
      name,
      inferredType,
      missingCount,
      uniqueCount,
      sampleValues,
    };
  });

  return {
    datasetId,
    filename,
    sampleRowCount,
    columns,
    sampleRows,
  };
}
