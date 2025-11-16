import { Request, Response, NextFunction } from 'express';
import { signupLocal } from '../services/auth.service';
import { signupSchema } from '../validations/auth.validation';
import { EmailAlreadyExistsError } from '../errors/auth.error';

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