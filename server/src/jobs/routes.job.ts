import { Router } from 'express';
import {
  listJobsController,
  getJobStatusController,
  getJobResultController,
  exportJobResultController,
} from './controller.job';
import {authMiddleware} from "../middlewares/protectedRoutes"
import { restartProcessingJobController } from 'src/controllers/dataset.controller';

const router = Router();

// GET /api/jobs
router.get('/', authMiddleware, listJobsController);

// GET /api/jobs/:id/status
router.get('/:id/status', authMiddleware, getJobStatusController);

// GET /api/jobs/:id/result
router.get('/:id/result', authMiddleware, getJobResultController);

// GET /api/jobs/:id/export?format=csv|json|txt
router.get('/:id/export', authMiddleware, exportJobResultController);

// POST /api/jobs/:jobId/restart
router.post('/:jobId/restart', authMiddleware, restartProcessingJobController);

export const jobRouter = router;
