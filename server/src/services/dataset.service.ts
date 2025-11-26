import { prisma } from '@loaders/prisma';
import type { DatasetUploadDTO, DatasetResponseDTO, JobDTO } from '../types/dataset.types';
import { JobStatus } from '../../prisma/.prisma/client';
import { preprocessQueue } from '@loaders/queue';
import fs from 'fs';
import path from 'path';
import { redis } from '@loaders/redis';

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
  extras?: { rawData?: string | null; processedData?: string | null }
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

    // Only set when provided (e.g. get by id)
    ...(extras?.rawData !== undefined ? { rawData: extras.rawData ?? '' } : {}),
    ...(extras?.processedData !== undefined ? { processedData: extras.processedData } : {}),
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
  datasetId: string
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

  // raw CSV path (as stored by multer / normalize middleware)
  const rawPath = dataset.storagePath;

  // processed CSV assumed to be same filename but under raw/processed
  // Example:
  //   raw/uploads/myfile.csv  ->  raw/processed/myfile.csv
  let processedPath = `raw/processed/${dataset.jobs[0].resultKey}.csv`;
  if (processedPath.includes(`${path.sep}uploads${path.sep}`)) {
    processedPath = processedPath.replace(
      `${path.sep}uploads${path.sep}`,
      `${path.sep}processed${path.sep}`
    );
  } else {
    // fallback: simple string replace if paths are like "raw/uploads/..."
    processedPath = processedPath.replace('raw/uploads/', 'raw/processed/');
  }

  const [rawData, processedData] = await Promise.all([
    readFileIfExists(rawPath),
    readFileIfExists(processedPath),
  ]);

  return toDatasetResponse(dataset, {
    rawData: rawData ?? '',
    processedData,
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
