// src/middleware/normalizeUploadToCsv.ts
import type { Request, Response, NextFunction } from 'express';
import fs from 'fs/promises';
import path from 'path';
import * as XLSX from 'xlsx';
import { parse as json2csv } from 'json2csv';

export async function normalizeUploadToCsv(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const file = req.file;

  if (!file) {
    return next();
  }

  const ext = path.extname(file.originalname).toLowerCase();
  const dir = path.dirname(file.path);
  const baseName = path.basename(file.originalname, ext);

  // Preserve original info so services can store it in DB
  (file as any).originalMimeType = file.mimetype;
  (file as any).originalPath = file.path;

  // Already CSV? Nothing to do.
  if (file.mimetype === 'text/csv' || ext === '.csv') {
    const stats = await fs.stat(file.path);
    file.size = stats.size;
    return next();
  }

  const csvFilename = `${baseName}-${Date.now()}.csv`;
  const csvPath = path.join(dir, csvFilename);

  try {
    if (file.mimetype === 'application/json' || ext === '.json') {
      // JSON → CSV
      const content = await fs.readFile(file.path, 'utf-8');
      const json = JSON.parse(content);
      const rows = Array.isArray(json) ? json : json.data ?? json;

      const csv = json2csv(rows as any[]);
      await fs.writeFile(csvPath, csv, 'utf-8');
    } else if (
      file.mimetype === 'application/vnd.ms-excel' ||
      file.mimetype ===
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      ext === '.xls' ||
      ext === '.xlsx'
    ) {
      // Excel → CSV (first sheet)
      const workbook = XLSX.readFile(file.path);
      const firstSheetName = workbook.SheetNames[0];
      const firstSheet = workbook.Sheets[firstSheetName];
      const csv = XLSX.utils.sheet_to_csv(firstSheet);
      await fs.writeFile(csvPath, csv, 'utf-8');
    } else {
      // Should not happen due to multer filter, but just in case:
      return next(new Error('UNSUPPORTED_FILE_TYPE'));
    }

    // Optionally remove the original upload
    await fs.unlink(file.path).catch(() => {});

    // Update req.file to point to the CSV (for storagePath, sizeBytes, etc.)
    const stats = await fs.stat(csvPath);
    file.path = csvPath;
    file.filename = path.basename(csvPath);
    file.size = stats.size;
    // You *can* keep file.mimetype as original or set to 'text/csv'.
    // Since you want DB to store original type, we'll keep it as-is.

    return next();
  } catch (err) {
    return next(err);
  }
}
