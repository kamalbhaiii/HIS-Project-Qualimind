import { Request, Response, NextFunction } from 'express';
import { createDatasetWithJob } from '../services/dataset.service';

export async function uploadDatasetController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = req.authUser;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: 'File is required' });
    }

    const body = req.body as { name?: string };

    const dataset = await createDatasetWithJob({
      ownerId: user.sub,
      body,
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
