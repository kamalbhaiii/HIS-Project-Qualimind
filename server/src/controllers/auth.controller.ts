import { Request, Response, NextFunction } from 'express';
import { signupLocal, loginLocal } from '../services/auth.service';
import { signupSchema, loginSchema } from '../validations/auth.validation';
import { EmailAlreadyExistsError } from '../errors/auth.error';
import { signAuthToken } from '../utils/jwt.util';

export async function signupController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const parsed = signupSchema.safeParse(req.body);

    if (!parsed.success) {
      const messages = parsed.error.issues.map((i) => i.message);
      return res.status(400).json({
        message: 'Validation failed',
        errors: messages,
      });
    }

    const result = await signupLocal(parsed.data);
    return res.status(201).json(result);
  } catch (err) {
    if (err instanceof EmailAlreadyExistsError) {
      return res.status(409).json({ message: err.message });
    }
    return next(err); // global error handler -> 500
  }
}

export async function loginController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: parsed.error.issues.map((i) => i.message),
      });
    }

    const { email, password } = parsed.data;

    try {
      const user = await loginLocal(email, password);
      const token = signAuthToken(user);

      return res.status(200).json({
        user,
        token,
      });
    } catch (err: any) {
      if (err instanceof Error && err.message === 'INVALID_CREDENTIALS') {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      throw err;
    }
  } catch (err) {
    return next(err);
  }
}