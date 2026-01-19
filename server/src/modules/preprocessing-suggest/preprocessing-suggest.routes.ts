import { Router } from 'express';
import { authMiddleware } from '../../middlewares/protectedRoutes';
import { suggestPreprocessingController } from './preprocessing-suggest.controllers';

const router = Router();

// POST /api/preprocessing/suggest
router.post('/suggest', authMiddleware, suggestPreprocessingController);

export default router;
