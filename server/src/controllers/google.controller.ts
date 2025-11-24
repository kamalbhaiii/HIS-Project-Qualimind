import { Request, Response, NextFunction } from 'express';
import { getGoogleAuthUrl, handleGoogleCallback } from '../services/google.service';
import { signAuthToken } from '../utils/jwt.util';
import cfg from '../config/index';

export function googleAuthUrlController(_req: Request, res: Response) {
  const url = getGoogleAuthUrl();
  return res.status(200).json({ url });
}

export async function googleCallbackController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const code = req.query.code as string | undefined;

    if (!code) {
      return res.status(400).json({ message: 'Missing "code" query parameter' });
    }

    const user = await handleGoogleCallback(code);
    const token = signAuthToken(user);

    const name  = user.name  ?? ''; // fallback to empty string or whatever you like
    const email = user.email ?? '';
    const id    = user.id    ?? '';

    const redirectUrl = `${cfg.frontend.url}/google-callback` +
      `?token=${encodeURIComponent(token)}` +
      `&name=${encodeURIComponent(name)}` +
      `&email=${encodeURIComponent(email)}` +
      `&id=${encodeURIComponent(id)}`;

    return res.redirect(redirectUrl);
  } catch (err) {
    return res.redirect(
      `${cfg.frontend.url}/sign-in?error=oauth_failed`
    );
  }
}
