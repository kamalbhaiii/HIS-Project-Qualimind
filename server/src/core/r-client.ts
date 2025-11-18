import axios from 'axios';
import fs from 'fs/promises';
import { parse } from 'csv-parse/sync';
import cfg from '@config/index';

export interface RPreprocessResponse {
  jobId: string;
  status: string;
  rows: number;
  originalRows?: number;
  storage?: {
    redis?: string;
    postgres?: string;
  };
  metadata?: unknown;
  data?: unknown;
}

export class REngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'REngineError';
  }
}

interface CallRPreprocessParams {
  processingJobId: string;
  datasetPath: string;     // Node’s file path (e.g. uploads/raw/...)
  filename: string;        // original filename
  mimeType: string;
}

export async function callRPreprocess(params: CallRPreprocessParams): Promise<RPreprocessResponse> {
  const { processingJobId, datasetPath, filename, mimeType } = params;

  // For now, we only support CSV (R’s /process is designed around tabular data)
  if (mimeType !== 'text/csv') {
    throw new REngineError(`R engine currently supports only CSV. Got mimeType=${mimeType}`);
  }

  const baseUrl = cfg.rService.url;
  const endpoint = cfg.rService.processEndpoint  ?? '/process';

  if (!baseUrl) {
    throw new REngineError('rEngine.baseUrl is not configured');
  }

  // 1) Read CSV file
  const csvContent = await fs.readFile(datasetPath, 'utf-8');

  // 2) Parse into array of objects (header row → keys)
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  }) as Record<string, unknown>[];

  if (!records.length) {
    throw new REngineError('Dataset appears to be empty after parsing');
  }

  // 3) Build payload for R /process
  const payload = {
    jobId: processingJobId,
    filename,
    data: records,
  };

  const url = `${baseUrl.replace(/\/$/, '')}${endpoint}`;

  try {
    const res = await axios.post<RPreprocessResponse>(url, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 5 * 60 * 1000, // 5 minutes, adjust as needed
    });

    const body = res.data;

    if (!body.jobId || body.jobId !== processingJobId) {
      // Should match what we sent; if not, treat as error
      throw new REngineError(
        `R engine returned jobId=${body.jobId}, expected ${processingJobId}`
      );
    }

    if (body.storage && body.storage.redis !== 'success') {
      throw new REngineError('R engine failed to store result in Redis');
    }

    return body;
  } catch (err: any) {
    const msg =
      err?.response?.data?.error ??
      err?.message ??
      'Unknown error calling R engine';
    throw new REngineError(msg);
  }
}
