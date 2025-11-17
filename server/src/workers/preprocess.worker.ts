import cfg from '@config/index';
import { Worker, Job } from 'bullmq';
import { redis } from '@loaders/redis';
import { prisma } from '@loaders/prisma';
import { JobStatus } from '../../prisma/.prisma/client';
import { logger } from '@core/logger'; // assuming you have one
import { saveProcessedResult } from './result-store'; // we’ll define below
import { mockRProcess } from './r-mock'; // temporary R stub

interface PreprocessJobData {
  processingJobId: string;
  datasetId: string;
}

const worker = new Worker<PreprocessJobData>(
  'preprocess',
  async (job: Job<PreprocessJobData>) => {
    const { processingJobId, datasetId } = job.data;

    logger.info(`Starting preprocessing job ${processingJobId} for dataset ${datasetId}`);

    // mark job as RUNNING
    await prisma.processingJob.update({
      where: { id: processingJobId },
      data: {
        status: JobStatus.RUNNING,
        startedAt: new Date(),
      },
    });

    try {
      // Load dataset metadata
      const dataset = await prisma.dataset.findUnique({
        where: { id: datasetId },
      });

      if (!dataset) {
        throw new Error(`Dataset ${datasetId} not found`);
      }

      // For now, call a mock R function; later this will call the real R API
      const processed = await mockRProcess(dataset.storagePath);

      // Save processed result somewhere (e.g., Redis)
      const resultKey = await saveProcessedResult(processingJobId, processed);

      // mark job as SUCCESS
      await prisma.processingJob.update({
        where: { id: processingJobId },
        data: {
          status: JobStatus.SUCCESS,
          completedAt: new Date(),
          resultKey,
        },
      });

      logger.info(`Job ${processingJobId} completed successfully`);
    } catch (err: any) {
      logger.error(`Job ${processingJobId} failed`, { err });

      await prisma.processingJob.update({
        where: { id: processingJobId },
        data: {
          status: JobStatus.FAILED,
          errorMessage: err?.message ?? 'Unknown error',
          completedAt: new Date(),
        },
      });

      throw err; 
    }
  },
  {
    connection: cfg.redis,
  }
);

worker.on('error', (err) => {
  console.error('Worker error', err);
});
