import { Router } from 'express';
import health from './health.route';
import auth from './auth.route';
import dataset from './dataset.route';
import { jobRouter } from '../jobs/routes.job';


const router = Router();

router.use('/health', health);
router.use('/auth', auth);
router.use('/datasets', dataset);
router.use('/jobs', jobRouter);

export default router;
