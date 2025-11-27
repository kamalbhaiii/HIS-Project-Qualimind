// src/jobs/service.job.ts
import { prisma } from '@loaders/prisma';
import { getProcessedResult } from '@core/result-store';
import { JobStatus } from '../../prisma/.prisma/client';

export type ExportFormat = 'json' | 'csv' | 'txt';

export interface JobResult {
  jobId: string;
  status: string;
  result: unknown | null;
}

// existing getJobResult + exportJobResult...

// ---------- NEW: embedded dataset DTO ----------
export interface JobDatasetDTO {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface JobResponseDTO {
  id: string;
  datasetId: string;
  status: JobStatus;
  errorMessage: string | null;
  resultKey: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  dataset: JobDatasetDTO;
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
    status: job.status,
    errorMessage: job.errorMessage ?? null,
    resultKey: job.resultKey ?? null,
    createdAt: job.createdAt.toISOString(),
    startedAt: job.startedAt ? job.startedAt.toISOString() : null,
    completedAt: job.completedAt ? job.completedAt.toISOString() : null,
    dataset: {
      id: job.dataset.id,
      name: job.dataset.name,
      originalName: job.dataset.originalName,
      mimeType: job.dataset.mimeType,
      sizeBytes: job.dataset.sizeBytes,
      createdAt: job.dataset.createdAt.toISOString(),
    },
  };
}
