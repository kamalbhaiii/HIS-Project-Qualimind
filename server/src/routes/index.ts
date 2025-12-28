import { Router } from 'express';
import health from './health.route';
import auth from './auth.route';
import dataset from './dataset.route';
import { jobRouter } from '../jobs/routes.job';
import preprocessingSuggestRouter from '@modules/preprocessing-suggest/preprocessing-suggest.routes'
import insightsRouter from '@modules/insights/insights.routes';


const router = Router();

router.use('/health', health);
router.use('/auth', auth);
router.use('/datasets', dataset);
router.use('/jobs', jobRouter);
router.use('/preprocessing', preprocessingSuggestRouter);
router.use('/insights', insightsRouter);

export default router;
