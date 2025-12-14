import { Request, Response, NextFunction } from 'express';
import { suggestPreprocessingService } from './preprocessing-suggest.services';

export async function suggestPreprocessingController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = req.authUser;
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const datasetId = String(req.body?.datasetId || '').trim();
    const sampleRowCount = req.body?.sampleRowCount;

    if (!datasetId) return res.status(400).json({ message: 'datasetId is required' });

    const result = await suggestPreprocessingService({
      ownerId: user.sub,
      datasetId,
      sampleRowCount,
    });

    return res.status(200).json(result);
  } catch (err: any) {
    if (err?.code === 'DATASET_NOT_FOUND') return res.status(404).json({ message: err.message });
    if (err?.code === 'FORBIDDEN') return res.status(403).json({ message: err.message });

    // Zod validation errors should be 400
    if (err?.name === 'ZodError') {
      return res.status(400).json({
        message: 'Invalid preprocessingConfig returned by provider',
        details: err.errors,
      });
    }

    return next(err);
  }
}
