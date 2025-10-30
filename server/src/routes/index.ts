import { Router } from 'express';
import health from './health.route';

const router = Router();

router.use('/health', health);
// add future routes here (upload, process, results)

export default router;
