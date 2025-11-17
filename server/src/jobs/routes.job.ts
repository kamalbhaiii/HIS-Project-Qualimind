import { Router } from 'express';
import { authMiddleware } from '../middlewares/protectedRoutes';
import { getJobStatusController } from './controller.job';

const router = Router();

router.get('/:id/status', authMiddleware, getJobStatusController);

export const jobRouter = router;
