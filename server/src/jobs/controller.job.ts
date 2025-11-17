import { Request, Response, NextFunction } from 'express';
import { prisma } from '@loaders/prisma';

export async function getJobStatusController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;

    const job = await prisma.processingJob.findUnique({
      where: { id },
      include: {
        dataset: true,
      },
    });

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    return res.json({
      id: job.id,
      status: job.status,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      datasetId: job.datasetId,
      datasetName: job.dataset.name,
    });
  } catch (err) {
    next(err);
  }
}
