import { prisma } from '@loaders/prisma';
import type { DatasetUploadDTO, DatasetResponseDTO } from '../types/dataset.types';
import { JobStatus } from '../../prisma/.prisma/client';
import { preprocessQueue } from '@loaders/queue';

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
      jobs: true,
    },
  });

  const job = dataset.jobs[0];

  await preprocessQueue.add('preprocess-dataset', {
    processingJobId: job.id,
    datasetId: dataset.id,
  });

  return {
    id: dataset.id,
    name: dataset.name,
    jobId: job.id,
    originalName: dataset.originalName,
    mimeType: dataset.mimeType,
    sizeBytes: dataset.sizeBytes,
    createdAt: dataset.createdAt.toISOString(),
  };
}

/**
 * Helper to map a dataset (with jobs) into DatasetResponseDTO
 */
function toDatasetResponse(
  dataset: any // you can tighten this with Prisma types if you want
): DatasetResponseDTO {
  const job = dataset.jobs?.[0];

  return {
    id: dataset.id,
    name: dataset.name,
    jobId: job ? job.id : null,
    originalName: dataset.originalName,
    mimeType: dataset.mimeType,
    sizeBytes: dataset.sizeBytes,
    createdAt: dataset.createdAt.toISOString(),
  };
}

/**
 * Get all datasets for a given user.
 */
export async function getUserDatasets(
  ownerId: string
): Promise<DatasetResponseDTO[]> {
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

  return datasets.map(toDatasetResponse);
}

/**
 * Get a single dataset by id for a user.
 * Returns null if not found or not owned by the user.
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

  return toDatasetResponse(dataset);
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
 * Returns null if dataset doesn't exist or doesn't belong to user.
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
      // only allow name to be updated for now
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
export async function deleteDataset(
  ownerId: string,
  datasetId: string
): Promise<boolean> {
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

  // If you don't have onDelete: Cascade, you need to delete jobs manually.
  await prisma.processingJob.deleteMany({
    where: { datasetId },
  });

  await prisma.dataset.delete({
    where: { id: datasetId },
  });

  return true;
}
