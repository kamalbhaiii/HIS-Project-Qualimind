import { JobStatus } from '../../prisma/.prisma/client';

export interface JobDTO {
  id: string;
  status: JobStatus;
  errorMessage: string | null;
  resultKey: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface DatasetUploadDTO {
  name?: string;
}

export interface DatasetProcessingSummaryDTO {
  jobId: string;
  originalFilename: string;
  originalRows: number;
  processedRows: number;
  processedColumns: number;
  createdAt: string;
  processedAt: string | null;
  metadata: any;        
  processingStats: any;   
}

export interface DatasetResponseDTO {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;

  jobId: string | null;
  job: JobDTO | null;

  rawData?: string;
  processedData?: string;

  // NEW: data coming from the R-created table
  processingSummary?: DatasetProcessingSummaryDTO | null;
}