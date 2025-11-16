import { Request, Response, NextFunction } from 'express';
import { getGoogleAuthUrl, handleGoogleCallback } from '../services/google.service';
import { signAuthToken } from '../utils/jwt.util';

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

    return res.status(200).json({
      user,
      token,
    });
  } catch (err) {
    return next(err);
  }
}
