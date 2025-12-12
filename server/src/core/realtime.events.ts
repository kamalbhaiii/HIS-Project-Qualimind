export const JOB_UPDATES_CHANNEL = "job:updates";

export type JobUpdateEvent = {
  ownerId: string;
  jobId: string;
  datasetId: string;
  status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";
  message?: string;
};
