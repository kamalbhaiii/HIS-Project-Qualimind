import { Request, Response, NextFunction } from 'express';
import {
  createDatasetWithJob,
  getUserDatasets,
  getDatasetById,
  updateDataset,
  deleteDataset,
  restartFailedProcessingJob
} from '../services/dataset.service';
import { parseJsonField, validatePreprocessingConfig, normalizePreprocessingTasks } from '../utils/preprocessing.util'

export async function uploadDatasetController(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.authUser;
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const file = req.file;
    if (!file) return res.status(400).json({ message: 'File is required' });

    const body = req.body as {
      name?: string;
      preprocessingTasks?: string | string[];
      preprocessingConfig?: string; // multipart string
    };

    const preprocessingTasks = normalizePreprocessingTasks(body.preprocessingTasks);

    const parsedConfig = parseJsonField(body.preprocessingConfig);
    let preprocessingConfig: any | null = null;

    if (body.preprocessingConfig != null) {
      if (!parsedConfig) return res.status(400).json({ message: 'Invalid JSON in preprocessingConfig' });

      const v = validatePreprocessingConfig(parsedConfig);
      if (!v.ok) return res.status(400).json({ message: v.error });

      preprocessingConfig = v.value;
    }

    const dataset = await createDatasetWithJob({
      ownerId: user.sub,
      body: {
        name: body.name,
        preprocessingTasks,
        preprocessingConfig,
      },
      file,
    });

    return res.status(201).json(dataset);
  } catch (err: any) {
    if (err instanceof Error && err.message === 'FILE_REQUIRED') {
      return res.status(400).json({ message: 'File is required' });
    }
    return next(err);
  }
}

export async function restartProcessingJobController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = req.authUser;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const jobId = String(req.params.jobId || '').trim();
    if (!jobId) {
      return res.status(400).json({ message: 'jobId is required' });
    }

    const result = await restartFailedProcessingJob({
      ownerId: user.sub,
      jobId,
    });

    return res.status(200).json(result);
  } catch (err: any) {
    // map known errors to HTTP codes
    const code = err?.code || err?.name;

    if (code === 'JOB_NOT_FOUND') {
      return res.status(404).json({ message: 'Job not found' });
    }
    if (code === 'FORBIDDEN') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (code === 'JOB_NOT_RESTARTABLE') {
      return res.status(409).json({ message: err.message });
    }

    return next(err);
  }
}

/**
 * GET /api/datasets
 * List all datasets for the authenticated user.
 */
export async function getUserDatasetsController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = req.authUser;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const datasets = await getUserDatasets(user.sub);
    return res.status(200).json(datasets);
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/datasets/:id
 * Get a specific dataset for the authenticated user.
 */
export async function getDatasetByIdController(
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

    const dataset = await getDatasetById(user.sub, id, req?.headers?.authorization || '');

    if (!dataset) {
      return res.status(404).json({ message: 'Dataset not found' });
    }

    return res.status(200).json(dataset);
  } catch (err) {
    return next(err);
  }
}

/**
 * PATCH /api/datasets/:id
 * Modify dataset (currently only name).
 */
export async function updateDatasetController(
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
    const body = req.body as { name?: string };

    if (body.name === undefined) {
      return res.status(400).json({ message: 'Nothing to update' });
    }

    const updated = await updateDataset({
      ownerId: user.sub,
      datasetId: id,
      body,
    });

    if (!updated) {
      return res.status(404).json({ message: 'Dataset not found' });
    }

    return res.status(200).json(updated);
  } catch (err) {
    return next(err);
  }
}

/**
 * DELETE /api/datasets/:id
 * Delete dataset (and its jobs) for the authenticated user.
 */
export async function deleteDatasetController(
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

    const deleted = await deleteDataset(user.sub, id);

    if (!deleted) {
      return res.status(404).json({ message: 'Dataset not found' });
    }

    // No content on successful delete
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}
