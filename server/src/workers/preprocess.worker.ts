import cfg from '@config/index';
import { Worker, Job } from 'bullmq';
import { redis } from '@loaders/redis';
import { prisma } from '@loaders/prisma';
import { JobStatus } from '../../prisma/.prisma/client';
import { logger } from '@core/logger';
import { callRPreprocess, REngineError } from '@core/r-client';

interface PreprocessJobData {
  processingJobId: string;
  datasetId: string;
}

const worker = new Worker<PreprocessJobData>(
  'preprocess',
  async (job: Job<PreprocessJobData>) => {
    const { processingJobId, datasetId } = job.data;

    logger.info(`Starting preprocessing job ${processingJobId} for dataset ${datasetId}`);

    await prisma.processingJob.update({
      where: { id: processingJobId },
      data: {
        status: JobStatus.RUNNING,
        startedAt: new Date(),
      },
    });

    try {
      const dataset = await prisma.dataset.findUnique({
        where: { id: datasetId },
      });

      if (!dataset) {
        throw new Error(`Dataset ${datasetId} not found`);
      }

      const rResponse = await callRPreprocess({
        processingJobId,
        datasetPath: dataset.storagePath,
        filename: dataset.originalName,
        mimeType: dataset.mimeType,
      });

      const resultKey = `processed:${processingJobId}`;

      await prisma.processingJob.update({
        where: { id: processingJobId },
        data: {
          status: JobStatus.SUCCESS,
          completedAt: new Date(),
          resultKey,
        },
      });

      logger.info(
        `Job ${processingJobId} completed successfully via R engine`,
        {
          rows: rResponse.rows,
          originalRows: rResponse.originalRows,
        }
      );
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
  { connection: redis }
);

worker.on('error', (err) => {
  console.error('Worker error', err);
});
