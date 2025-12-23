import cfg from '@config/index';
import { Worker, Job } from 'bullmq';
import { redis } from '@loaders/redis';
import { prisma } from '@loaders/prisma';
import { JobStatus } from '../../prisma/.prisma/client';
import { logger } from '@core/logger';
import { callRPreprocess } from '@core/r-client';
import {JOB_UPDATES_CHANNEL, JobUpdateEvent} from '@core/realtime.events';

interface PreprocessJobData {
  processingJobId: string;
  datasetId: string;
  preprocessingTasks?: string[];
  preprocessingConfig?: any;
  correlationConfig?: any;
}

const pub = redis.duplicate();

async function publishJobUpdate(evt: JobUpdateEvent) {
  try {
    await pub.publish(JOB_UPDATES_CHANNEL, JSON.stringify(evt));
  } catch (e: any) {
    // Don’t fail the job because realtime publishing failed
    logger.warn('Failed to publish job update', { evt, error: e?.message });
  }
}

const worker = new Worker<PreprocessJobData>(
  'preprocess',
  async (job: Job<PreprocessJobData>) => {
    const { processingJobId, datasetId, preprocessingTasks, preprocessingConfig, correlationConfig } = job.data;

    logger.info(`Starting preprocessing job ${processingJobId} for dataset ${datasetId}`);

    // Fetch dataset to get ownerId (required to route to `user:${ownerId}` room)
    const dataset = await prisma.dataset.findUnique({
      where: { id: datasetId },
      select: {
        ownerId: true,
        storagePath: true,
        originalName: true,
        mimeType: true,
      },
    });

    if (!dataset) {
      throw new Error(`Dataset ${datasetId} not found`);
    }

    // 1) RUNNING
    await prisma.processingJob.update({
      where: { id: processingJobId },
      data: {
        status: JobStatus.RUNNING,
        startedAt: new Date(),
      },
    });

    await publishJobUpdate({
      ownerId: dataset.ownerId,
      jobId: processingJobId,
      datasetId,
      status: 'RUNNING',
      message: 'Preprocessing started',
    });

    try {
      // 2) Execute preprocessing
      const rResponse = await callRPreprocess({
        processingJobId,
        datasetPath: dataset.storagePath,
        filename: dataset.originalName,
        mimeType: dataset.mimeType,
        preprocessingTasks,
        preprocessingConfig,
        correlationConfig,
      });

      const resultKey = `processed:${processingJobId}`;

      // 3) SUCCESS
      await prisma.processingJob.update({
        where: { id: processingJobId },
        data: {
          status: JobStatus.SUCCESS,
          completedAt: new Date(),
          resultKey,
        },
      });

      logger.info(`Job ${processingJobId} completed successfully via R engine`, {
        rows: rResponse?.rows,
        originalRows: rResponse?.originalRows,
      });

      await publishJobUpdate({
        ownerId: dataset.ownerId,
        jobId: processingJobId,
        datasetId,
        status: 'SUCCESS',
        message: 'Preprocessing completed',
      });

      return { resultKey };
    } catch (err: any) {
      // 4) FAILED
      logger.error(`Job ${processingJobId} failed`, { err });

      await prisma.processingJob.update({
        where: { id: processingJobId },
        data: {
          status: JobStatus.FAILED,
          errorMessage: err?.message ?? 'Unknown error',
          completedAt: new Date(),
        },
      });

      await publishJobUpdate({
        ownerId: dataset.ownerId,
        jobId: processingJobId,
        datasetId,
        status: 'FAILED',
        message: err?.message ?? 'Unknown error',
      });

      throw err;
    }
  },
  { connection: redis }
);

worker.on('error', (err) => {
  logger.error('Worker error', { err });
});

// Graceful shutdown (recommended)
async function shutdown() {
  try {
    await worker.close();
  } catch (e: any) {
    logger.warn('Error closing worker', { error: e?.message });
  }

  try {
    await pub.quit();
  } catch (e: any) {
    logger.warn('Error closing redis publisher', { error: e?.message });
  }

  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
