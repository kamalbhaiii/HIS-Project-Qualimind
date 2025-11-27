import { prisma } from '@loaders/prisma';
import { getProcessedResult } from '@core/result-store';
import { JobStatus } from '../../prisma/.prisma/client';

export type ExportFormat = 'json' | 'csv' | 'txt';

export interface JobResult {
  jobId: string;
  status: string;
  result: unknown | null;
}

export async function getJobResult(jobId: string): Promise<JobResult> {
  const job = await prisma.processingJob.findUnique({
    where: { id: jobId },
  });

  if (!job) {
    throw new Error('JOB_NOT_FOUND');
  }

  if (!job.resultKey) {
    return {
      jobId: job.id,
      status: job.status,
      result: null,
    };
  }

  const result = await getProcessedResult(job.resultKey);

  return {
    jobId: job.id,
    status: job.status,
    result,
  };
}

export async function exportJobResult(
  jobId: string,
  format: ExportFormat
): Promise<{ filename: string; mimeType: string; content: string }> {
  const job = await prisma.processingJob.findUnique({
    where: { id: jobId },
  });

  if (!job) {
    throw new Error('JOB_NOT_FOUND');
  }

  if (!job.resultKey) {
    throw new Error('NO_RESULT_AVAILABLE');
  }

  const result = await getProcessedResult(job.resultKey);

  if (!result) {
    throw new Error('NO_RESULT_AVAILABLE');
  }

  const baseName = `job-${jobId}-result`;

  if (format === 'json') {
    return {
      filename: `${baseName}.json`,
      mimeType: 'application/json',
      content: JSON.stringify(result, null, 2),
    };
  }

  if (format === 'txt') {
    return {
      filename: `${baseName}.txt`,
      mimeType: 'text/plain',
      content: JSON.stringify(result, null, 2),
    };
  }

  if (format === 'csv') {
    if (Array.isArray(result)) {
      const rows = result as Record<string, unknown>[];

      if (rows.length === 0) {
        return {
          filename: `${baseName}.csv`,
          mimeType: 'text/csv',
          content: '',
        };
      }

      const headers = Object.keys(rows[0]);
      const csvRows = [
        headers.join(','),
        ...rows.map((row) =>
          headers
            .map((key) => {
              const value = row[key];
              if (value === null || value === undefined) return '';
              const str = String(value);
              const escaped = str.replace(/"/g, '""');
              if (/[",\n]/.test(escaped)) {
                return `"${escaped}"`;
              }
              return escaped;
            })
            .join(',')
        ),
      ];

      return {
        filename: `${baseName}.csv`,
        mimeType: 'text/csv',
        content: csvRows.join('\n'),
      };
    }

    return {
      filename: `${baseName}.csv`,
      mimeType: 'text/csv',
      content: `data\n"${JSON.stringify(result).replace(/"/g, '""')}"`,
    };
  }

  throw new Error('UNSUPPORTED_FORMAT');
}
export interface JobResult {
  jobId: string;
  status: string;
  result: unknown | null;
}

// existing getJobResult + exportJobResult here...

// ---------- NEW DTO types for CRUD ----------
export interface JobResponseDTO {
  id: string;
  datasetId: string;
  datasetName: string;
  status: JobStatus;
  errorMessage: string | null;
  resultKey: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface CreateJobDTO {
  datasetId: string;
}

export interface UpdateJobDTO {
  status?: JobStatus;
  errorMessage?: string | null;
}

// internal mapper
function toJobResponse(job: any): JobResponseDTO {
  return {
    id: job.id,
    datasetId: job.datasetId,
    datasetName: job.dataset.name,
    status: job.status,
    errorMessage: job.errorMessage ?? null,
    resultKey: job.resultKey ?? null,
    createdAt: job.createdAt.toISOString(),
    startedAt: job.startedAt ? job.startedAt.toISOString() : null,
    completedAt: job.completedAt ? job.completedAt.toISOString() : null,
  };
}

/**
 * Create a new job for a dataset owned by this user.
 */
export async function createJobForDataset(
  ownerId: string,
  body: CreateJobDTO
): Promise<JobResponseDTO | null> {
  const { datasetId } = body;

  // ensure dataset exists and belongs to user
  const dataset = await prisma.dataset.findFirst({
    where: {
      id: datasetId,
      ownerId,
    },
  });

  if (!dataset) {
    return null;
  }

  const job = await prisma.processingJob.create({
    data: {
      datasetId: dataset.id,
      status: JobStatus.PENDING,
    },
    include: {
      dataset: true,
    },
  });

  // if you have a queue, you can enqueue here if needed
  // await preprocessQueue.add('preprocess-dataset', { processingJobId: job.id, datasetId: dataset.id });

  return toJobResponse(job);
}

/**
 * List all jobs for the current user (across all their datasets).
 */
export async function listJobsForUser(ownerId: string): Promise<JobResponseDTO[]> {
  const jobs = await prisma.processingJob.findMany({
    where: {
      dataset: {
        ownerId,
      },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      dataset: true,
    },
  });

  return jobs.map(toJobResponse);
}

/**
 * Get a single job by id for the current user.
 */
export async function getJobByIdForUser(
  ownerId: string,
  jobId: string
): Promise<JobResponseDTO | null> {
  const job = await prisma.processingJob.findFirst({
    where: {
      id: jobId,
      dataset: {
        ownerId,
      },
    },
    include: {
      dataset: true,
    },
  });

  if (!job) return null;

  return toJobResponse(job);
}

/**
 * Update a job (status / errorMessage) for the current user.
 */
export async function updateJobForUser(
  ownerId: string,
  jobId: string,
  body: UpdateJobDTO
): Promise<JobResponseDTO | null> {
  const existing = await prisma.processingJob.findFirst({
    where: {
      id: jobId,
      dataset: {
        ownerId,
      },
    },
    include: {
      dataset: true,
    },
  });

  if (!existing) return null;

  const updated = await prisma.processingJob.update({
    where: { id: jobId },
    data: {
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.errorMessage !== undefined ? { errorMessage: body.errorMessage } : {}),
    },
    include: {
      dataset: true,
    },
  });

  return toJobResponse(updated);
}

/**
 * Delete a job (must belong to user's dataset).
 */
export async function deleteJobForUser(ownerId: string, jobId: string): Promise<boolean> {
  const existing = await prisma.processingJob.findFirst({
    where: {
      id: jobId,
      dataset: {
        ownerId,
      },
    },
  });

  if (!existing) return false;

  await prisma.processingJob.delete({
    where: { id: jobId },
  });

  return true;
}
