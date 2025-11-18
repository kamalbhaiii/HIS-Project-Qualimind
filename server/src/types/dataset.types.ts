export interface DatasetUploadDTO {
  name?: string;
}

export interface DatasetResponseDTO {
  id: string;
  name: string;
  jobId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}
