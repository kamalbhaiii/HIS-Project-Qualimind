// src/jobs/controller.job.ts
import { Request, Response, NextFunction } from 'express';
import { prisma } from '@loaders/prisma';
import {
  getJobResult,
  exportJobResult,
  createJobForDataset,
  listJobsForUser,
  getJobByIdForUser,
  updateJobForUser,
  deleteJobForUser,
} from './service.job';

// ---------- existing controllers ----------

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

export async function getJobResultController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;

    const jobResult = await getJobResult(id);

    if (!jobResult.result) {
      return res.status(200).json({
        jobId: jobResult.jobId,
        status: jobResult.status,
        result: null,
      });
    }

    return res.status(200).json(jobResult);
  } catch (err: any) {
    if (err instanceof Error && err.message === 'JOB_NOT_FOUND') {
      return res.status(404).json({ message: 'Job not found' });
    }
    return next(err);
  }
}

export async function exportJobResultController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;
    const format = (req.query.format as string | undefined)?.toLowerCase();

    if (!format || !['json', 'csv', 'txt'].includes(format)) {
      return res.status(400).json({
        message: 'Invalid or missing "format" query parameter. Use json, csv, or txt.',
      });
    }

    const { filename, mimeType, content } = await exportJobResult(
      id,
      format as 'json' | 'csv' | 'txt'
    );

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(content);
  } catch (err: any) {
    if (err instanceof Error && err.message === 'JOB_NOT_FOUND') {
      return res.status(404).json({ message: 'Job not found' });
    }
    if (err instanceof Error && err.message === 'NO_RESULT_AVAILABLE') {
      return res.status(409).json({ message: 'Result not available yet' });
    }
    if (err instanceof Error && err.message === 'UNSUPPORTED_FORMAT') {
      return res.status(400).json({ message: 'Unsupported export format' });
    }
    return next(err);
  }
}


export async function createJobController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = req.authUser;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const body = req.body as { datasetId: string };
    if (!body.datasetId) {
      return res.status(400).json({ message: 'datasetId is required' });
    }

    const job = await createJobForDataset(user.sub, { datasetId: body.datasetId });

    if (!job) {
      return res.status(404).json({ message: 'Dataset not found' });
    }

    return res.status(201).json(job);
  } catch (err) {
    return next(err);
  }
}

export async function listJobsController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = req.authUser;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const jobs = await listJobsForUser(user.sub);
    return res.status(200).json(jobs);
  } catch (err) {
    return next(err);
  }
}

export async function getJobByIdController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = req.authUser;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;

    const job = await getJobByIdForUser(user.sub, id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    return res.status(200).json(job);
  } catch (err) {
    return next(err);
  }
}

export async function updateJobController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = req.authUser;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;
    const body = req.body as { status?: string; errorMessage?: string | null };

    if (body.status === undefined && body.errorMessage === undefined) {
      return res.status(400).json({ message: 'Nothing to update' });
    }

    const job = await updateJobForUser(user.sub, id, body as any);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    return res.status(200).json(job);
  } catch (err) {
    return next(err);
  }
}

export async function deleteJobController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = req.authUser;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;

    const deleted = await deleteJobForUser(user.sub, id);
    if (!deleted) {
      return res.status(404).json({ message: 'Job not found' });
    }

    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}
