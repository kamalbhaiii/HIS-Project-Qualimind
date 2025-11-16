import { Router } from 'express';
import { signupController, loginController } from '../controllers/auth.controller';
import {
  googleAuthUrlController,
  googleCallbackController,
} from '../controllers/google.controller';

const router = Router();

// POST /auth/signup
router.post('/signup', signupController);

// POST /auth/login
router.post('/login', loginController);

// GET /auth/google/url -> returns the Google redirect URL
router.get('/google/url', googleAuthUrlController);

// GET /auth/google/callback?code=...
router.get('/google/callback', googleCallbackController);

export default router;
