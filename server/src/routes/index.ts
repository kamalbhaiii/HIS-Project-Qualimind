import { Router } from 'express';
import health from './health.route';
import auth from './auth.route';

const router = Router();

router.use('/health', health);
router.use('/auth', auth);
// add future routes here (upload, process, results)

export default router;
