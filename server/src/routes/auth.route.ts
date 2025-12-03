import { Router } from 'express';
import { signupController, loginController,
  updateNameController,
  updateEmailController,
  updatePasswordController,
  deleteAccountController,
  meController,
  verifyEmailController,
  resendVerificationEmailController
} from '../controllers/auth.controller';
import {
  googleAuthUrlController,
  googleCallbackController,
} from '../controllers/google.controller';
import { authMiddleware } from '../middlewares/protectedRoutes';

const router = Router();

// POST /auth/signup
router.post('/signup', signupController);

// POST /auth/login
router.post('/login', loginController);

// GET /auth/google/url
router.get('/google/url', googleAuthUrlController);

// GET /auth/google/callback?code=...
router.get('/google/callback', googleCallbackController);

// PUT /auth/me/name
router.put('/me/name', authMiddleware, updateNameController);

// PUT /auth/me/email
router.put('/me/email', authMiddleware, updateEmailController);

// PUT /auth/me/password
router.put('/me/password', authMiddleware, updatePasswordController);

// GET /auth/me
router.get('/me', authMiddleware, meController);

// DELETE /auth/me
router.delete('/me', authMiddleware, deleteAccountController);

// GET /auth/verify-email
router.get('/verify-email', verifyEmailController);

// POST /auth/verify-email/resend
router.get('/verify-email/resend', authMiddleware, resendVerificationEmailController);

export default router;
