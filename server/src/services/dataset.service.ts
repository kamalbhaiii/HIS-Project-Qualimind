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
    originalName: dataset.originalName,
    mimeType: dataset.mimeType,
    sizeBytes: dataset.sizeBytes,
    createdAt: dataset.createdAt.toISOString(),
  };
}
