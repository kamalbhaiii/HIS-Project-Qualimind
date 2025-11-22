import axios from 'axios';
import fs from 'fs/promises';
import { parse } from 'csv-parse/sync';
import cfg from '@config/index';

export interface RPreprocessResponse {
  jobId: string;
  status: string | string[] | undefined;
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
  datasetPath: string;
  filename: string;
  mimeType: string;
}

export async function callRPreprocess(
  params: CallRPreprocessParams
): Promise<RPreprocessResponse> {
  const { processingJobId, datasetPath, filename, mimeType } = params;

  if (mimeType !== 'text/csv') {
    throw new REngineError(
      `R engine currently supports only CSV. Got mimeType=${mimeType}`
    );
  }

  const baseUrl = cfg.rService.url;
  const endpoint = cfg.rService.processEndpoint ?? '/clean?jobId=';

  if (!baseUrl) {
    throw new REngineError('rEngine.baseUrl is not configured');
  }

  const csvContent = await fs.readFile(datasetPath, 'utf-8');

  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  }) as Record<string, unknown>[];

  if (!records.length) {
    throw new REngineError('Dataset appears to be empty after parsing');
  }

  const payload = {
    jobId: processingJobId,
    filename,
    data: records,
  };

  const url = `${baseUrl.replace(/\/$/, '')}${endpoint}${encodeURIComponent(
    processingJobId
  )}`;

  try {
    const res = await axios.post<RPreprocessResponse>(url, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 5 * 60 * 1000,
    });

    const body = res.data || ({} as RPreprocessResponse);

    // ----- jobId sanity check (soft) -----
    const expectedJobId = String(processingJobId).trim();
    const returnedJobId = String(body.jobId ?? '').trim();

    if (!returnedJobId) {
      console.warn(
        `R engine response missing jobId field for processingJobId=${expectedJobId}`
      );
    } else if (returnedJobId !== expectedJobId) {
      console.warn(
        `R engine returned jobId=${returnedJobId} (len=${returnedJobId.length}), expected ${expectedJobId} (len=${expectedJobId.length})`
      );
      // no longer throwing here
    }

    // ----- status normalisation -----
    let statusRaw: any = body.status;
    let statusStr: string | null = null;

    if (Array.isArray(statusRaw)) {
      statusStr = statusRaw.length > 0 ? String(statusRaw[0]) : null;
    } else if (typeof statusRaw === 'string') {
      statusStr = statusRaw;
    } else if (statusRaw != null) {
      statusStr = String(statusRaw);
    }

    const normalizedStatus = statusStr
      ? statusStr.trim().toLowerCase()
      : null;

    // Only treat as error if status is present and *not* a success status
    if (
      normalizedStatus &&
      normalizedStatus !== 'cleaned' &&
      normalizedStatus !== 'processed'
    ) {
      throw new REngineError(
        `R engine preprocessing failed with status=${statusStr}`
      );
    }

    let redisRaw: any = body.storage?.redis;
    let redisStr: string | null = null;

    if (Array.isArray(redisRaw)) {
      redisStr = redisRaw.length > 0 ? String(redisRaw[0]) : null;
    } else if (typeof redisRaw === 'string') {
      redisStr = redisRaw;
    } else if (redisRaw != null) {
      redisStr = String(redisRaw);
    }

    const redisNorm = redisStr ? redisStr.trim().toLowerCase() : null;

    if (redisNorm && redisNorm !== 'success') {
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
