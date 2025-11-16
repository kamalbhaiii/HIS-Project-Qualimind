import { Router } from 'express';
import { uploadDatasetController } from '../controllers/dataset.controller';
import { upload } from '@loaders/multer';
import { authMiddleware } from '../middlewares/protectedRoutes';

const router = Router();

// POST /api/datasets
router.post(
  '/',
  authMiddleware,
  upload.single('file'),
  uploadDatasetController
);

export default router;
