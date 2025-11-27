import { Router } from 'express';
import {
  createJobController,
  listJobsController,
  getJobByIdController,
  updateJobController,
  deleteJobController,
  getJobStatusController,
  getJobResultController,
  exportJobResultController,
} from './controller.job';
import {authMiddleware} from "../middlewares/protectedRoutes"

const router = Router();

// --- CRUD base routes ---

// POST /api/jobs      -> create a job for a dataset
router.post('/', authMiddleware, createJobController);

// GET /api/jobs       -> list all jobs for current user
router.get('/', authMiddleware, listJobsController);

// GET /api/jobs/:id   -> get a single job (details) for current user
router.get('/:id', authMiddleware, getJobByIdController);

// PATCH /api/jobs/:id -> update job (status, errorMessage)
router.patch('/:id', authMiddleware, updateJobController);

// DELETE /api/jobs/:id -> delete job
router.delete('/:id', authMiddleware, deleteJobController);

// --- existing specialized routes ---

// GET /api/jobs/:id/status
router.get('/:id/status', authMiddleware, getJobStatusController);

// GET /api/jobs/:id/result
router.get('/:id/result', authMiddleware, getJobResultController);

// GET /api/jobs/:id/export?format=csv|json|txt
router.get('/:id/export', authMiddleware, exportJobResultController);

export const jobRouter = router;
