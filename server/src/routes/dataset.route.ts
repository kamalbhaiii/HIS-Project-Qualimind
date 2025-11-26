import { Router } from 'express';
import {
  uploadDatasetController,
  getUserDatasetsController,
  getDatasetByIdController,
  updateDatasetController,
  deleteDatasetController,
} from '../controllers/dataset.controller';
import { upload } from '@loaders/multer';
import { authMiddleware } from '../middlewares/protectedRoutes';
import { normalizeUploadToCsv } from '../middlewares/normalizeToCSV';

const router = Router();

// POST /api/datasets
router.post(
  '/',
  authMiddleware,
  upload.single('file'),
  normalizeUploadToCsv,
  uploadDatasetController
);

// GET /api/datasets - get all datasets for current user
router.get('/', authMiddleware, getUserDatasetsController);

// GET /api/datasets/:id - get a specific dataset (owned by user)
router.get('/:id', authMiddleware, getDatasetByIdController);

// PATCH /api/datasets/:id - modify dataset (e.g., name)
router.patch('/:id', authMiddleware, updateDatasetController);

// DELETE /api/datasets/:id - delete dataset (and its jobs)
router.delete('/:id', authMiddleware, deleteDatasetController);

export default router;
