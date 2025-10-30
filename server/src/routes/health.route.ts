import { Router } from 'express';
import { getHealth } from '@services/health.service';

const router = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: Service is healthy
 */
router.get('/', (_req, res) => {
  res.json(getHealth());
});

export default router;
