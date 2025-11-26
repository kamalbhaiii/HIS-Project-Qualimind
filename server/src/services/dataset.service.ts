import { prisma } from '@loaders/prisma';
import type { DatasetUploadDTO, DatasetResponseDTO, JobDTO, DatasetProcessingSummaryDTO } from '../types/dataset.types';
import { JobStatus } from '../../prisma/.prisma/client';
import { preprocessQueue } from '@loaders/queue';
import fs from 'fs';
import path from 'path';
import { redis } from '@loaders/redis';
import axios from 'axios';
import cfg from "@config/index"

type ProcessingSummaryRow = {
  job_id: string;
  original_filename: string;
  original_rows: number;
  processed_rows: number;
  processed_columns: number;
  created_at: Date;
  processed_at: Date | null;
  metadata: any;
  processing_stats: any;
};

async function getProcessingSummaryForJob(jobId: string): Promise<ProcessingSummaryRow | null> {
  const rows = await prisma.$queryRaw<ProcessingSummaryRow[]>`
    SELECT
      job_id,
      original_filename,
      original_rows,
      processed_rows,
      processed_columns,
      created_at,
      processed_at,
      metadata,
      processing_stats
    FROM dataset_processing_summary
    WHERE job_id = ${jobId}
    ORDER BY created_at DESC
    LIMIT 1
  `;

  if (!rows || rows.length === 0) return null;
  return rows[0];
}


interface CreateDatasetParams {
  ownerId: string;
  body: DatasetUploadDTO;
  file: Express.Multer.File;
}

export async function createDatasetWithJob(
  params: CreateDatasetParams
): Promise<DatasetResponseDTO> {
  const { ownerId, body, file } = params;

  if (!file) {
    throw new Error('FILE_REQUIRED');
  }

  const dataset = await prisma.dataset.create({
    data: {
      ownerId,
      name: body.name || file.originalname,
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      storagePath: file.path,
      jobs: {
        create: {
          status: JobStatus.PENDING,
        },
      },
    },
    include: {
      jobs: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  const job = dataset.jobs[0];

  await preprocessQueue.add('preprocess-dataset', {
    processingJobId: job.id,
    datasetId: dataset.id,
  });

  return toDatasetResponse(dataset);
}

/**
 * Safely read a text file, returning null if it does not exist.
 */
async function readFileIfExists(filePath: string): Promise<string | null> {
  try {
    const data = await fs.promises.readFile(filePath, 'utf-8');
    return data;
  } catch (err: any) {
    if (err && err.code === 'ENOENT') {
      return null;
    }
    throw err;
  }
}

/**
 * Map Prisma job to JobDTO
 */
function toJobDTO(job: any | undefined): JobDTO | null {
  if (!job) return null;

  return {
    id: job.id,
    status: job.status,
    errorMessage: job.errorMessage ?? null,
    resultKey: job.resultKey ?? null,
    createdAt: job.createdAt.toISOString(),
    startedAt: job.startedAt ? job.startedAt.toISOString() : null,
    completedAt: job.completedAt ? job.completedAt.toISOString() : null,
  };
}

/**
 * Helper to map a dataset (with jobs) into DatasetResponseDTO
 * Optionally attach raw/processed data.
 */
function toDatasetResponse(
  dataset: any,
  extras?: {
    rawData?: string | null;
    processedData?: string | null;
    processingSummary?: DatasetProcessingSummaryDTO | null;
  }
): DatasetResponseDTO {
  const job = dataset.jobs?.[0];

  return {
    id: dataset.id,
    name: dataset.name,
    originalName: dataset.originalName,
    mimeType: dataset.mimeType,
    sizeBytes: dataset.sizeBytes,
    createdAt: dataset.createdAt.toISOString(),

    jobId: job ? job.id : null,
    job: toJobDTO(job),

    ...(extras?.rawData !== undefined ? { rawData: extras.rawData ?? '' } : {}),
    ...(extras?.processedData !== undefined ? { processedData: extras.processedData ?? '' } : {}),
    ...(extras?.processingSummary !== undefined
      ? { processingSummary: extras.processingSummary }
      : {}),
  };
}

/**
 * Get all datasets for a given user (with latest job info).
 */
export async function getUserDatasets(ownerId: string): Promise<DatasetResponseDTO[]> {
  const datasets = await prisma.dataset.findMany({
    where: { ownerId },
    orderBy: { createdAt: 'desc' },
    include: {
      jobs: {
        orderBy: { createdAt: 'desc' },
        take: 1, // latest job only
      },
    },
  });

  return datasets.map((d) => toDatasetResponse(d));
}

/**
 * Get a single dataset by id for a user.
 * Includes:
 *  - latest job info
 *  - raw CSV data (from raw/uploads)
 *  - processed CSV data (from raw/processed, if present)
 */
export async function getDatasetById(
  ownerId: string,
  datasetId: string,
  token: string
): Promise<DatasetResponseDTO | null> {
  const dataset = await prisma.dataset.findFirst({
    where: {
      id: datasetId,
      ownerId,
    },
    include: {
      jobs: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!dataset) {
    return null;
  }

  const job = dataset.jobs[0]; // may be undefined

  // 1) Ensure processed file exists by calling the job-result API
  if (job && job.status === 'SUCCESS' && job.resultKey) {
    try {
      await axios.get(`${cfg.app.url}/jobs/${job.id}/result`, {
        headers: {
          Authorization: token, // or `Bearer ${token}` if needed
        },
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error calling jobs result API:', err);
    }
  }

  // 2) RAW file path (original upload)
  const rawPath = dataset.storagePath;

  // 3) PROCESSED file path: raw/processed/<resultKey>.csv
  let processedPath: string | null = null;
  if (job?.resultKey) {
    processedPath = path.join('raw', 'processed', `${job.resultKey}.csv`);
  }

  const [rawData, processedDataFromFile, processingSummaryRow] = await Promise.all([
    readFileIfExists(rawPath),
    processedPath ? readFileIfExists(processedPath) : Promise.resolve(null),
    job ? getProcessingSummaryForJob(job.id) : Promise.resolve(null),
  ]);

  const processedData = processedDataFromFile ?? '';

  // 4) Map the raw DB row to the DTO shape
  const processingSummary = processingSummaryRow
    ? {
        jobId: processingSummaryRow.job_id,
        originalFilename: processingSummaryRow.original_filename,
        originalRows: processingSummaryRow.original_rows,
        processedRows: processingSummaryRow.processed_rows,
        processedColumns: processingSummaryRow.processed_columns,
        createdAt: processingSummaryRow.created_at.toISOString(),
        processedAt: processingSummaryRow.processed_at
          ? processingSummaryRow.processed_at.toISOString()
          : null,
        metadata: processingSummaryRow.metadata,
        processingStats: processingSummaryRow.processing_stats,
      }
    : null;

  // 5) Return everything together
  return toDatasetResponse(dataset, {
    rawData: rawData ?? '',
    processedData,
    processingSummary,
  });
}

interface UpdateDatasetParams {
  ownerId: string;
  datasetId: string;
  body: {
    name?: string;
  };
}

/**
 * Update a dataset (currently only name).
 * Returns dataset with latest job info.
 */
export async function updateDataset(
  params: UpdateDatasetParams
): Promise<DatasetResponseDTO | null> {
  const { ownerId, datasetId, body } = params;

  const existing = await prisma.dataset.findUnique({
    where: { id: datasetId },
    include: {
      jobs: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!existing || existing.ownerId !== ownerId) {
    return null;
  }

  const updated = await prisma.dataset.update({
    where: { id: datasetId },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
    },
    include: {
      jobs: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  return toDatasetResponse(updated);
}

/**
 * Delete a dataset (and its jobs) for a user.
 * Returns true if deleted, false if not found or not owned by user.
 */
export async function deleteDataset(ownerId: string, datasetId: string): Promise<boolean> {
  const existing = await prisma.dataset.findUnique({
    where: { id: datasetId },
    select: {
      id: true,
      ownerId: true,
    },
  });

  if (!existing || existing.ownerId !== ownerId) {
    return false;
  }

  // If you don't have onDelete: Cascade, delete jobs explicitly.
  await prisma.processingJob.deleteMany({
    where: { datasetId },
  });

  await prisma.dataset.delete({
    where: { id: datasetId },
  });

  return true;
}
