import { Request, Response, NextFunction } from 'express';
import { signupLocal, loginLocal,
  updateUserName,
  updateUserEmail,
  updateUserPassword,
  deleteUserAccount,
  verifyEmailFromToken
} from '../services/auth.service';
import { signupSchema, loginSchema,
  updateNameSchema,
  updateEmailSchema,
  updatePasswordSchema
} from '../validations/auth.validation';
import { EmailAlreadyExistsError, GoogleAccountNotAllowedError, InvalidOrExpiredVerificationTokenError, InvalidPasswordError, UserNotFoundError } from '../errors/auth.error';
import { signAuthToken } from '../utils/jwt.util';
import { PrismaClient, Prisma } from '../../prisma/.prisma/client';
import {prisma} from '@loaders/prisma'


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

export async function updateNameController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = req.authUser;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const parsed = updateNameSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: parsed.error.issues.map((i) => i.message),
      });
    }

    try {
      const updated = await updateUserName(user.sub, parsed.data.name);
      return res.status(200).json(updated);
    } catch (err) {
      if (err instanceof GoogleAccountNotAllowedError) {
        return res.status(403).json({
          message: 'Name change is not allowed for Google sign-in accounts',
        });
      }
      if (err instanceof Error && err.message === 'USER_NOT_FOUND') {
        return res.status(404).json({ message: 'User not found' });
      }
      throw err;
    }
  } catch (err) {
    return next(err);
  }
}

export async function updateEmailController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = req.authUser;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const parsed = updateEmailSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: parsed.error.issues.map((i) => i.message),
      });
    }

    const { newEmail, currentPassword } = parsed.data;

    try {
      const updated = await updateUserEmail(user.sub, newEmail, currentPassword);
      return res.status(200).json(updated);
    } catch (err) {
      if (err instanceof GoogleAccountNotAllowedError) {
        return res.status(403).json({
          message: 'Email change is not allowed for Google sign-in accounts',
        });
      }
      if (err instanceof InvalidPasswordError) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }
      if (err instanceof EmailAlreadyExistsError) {
        return res.status(409).json({ message: err.message });
      }
      if (err instanceof Error && err.message === 'USER_NOT_FOUND') {
        return res.status(404).json({ message: 'User not found' });
      }
      throw err;
    }
  } catch (err) {
    return next(err);
  }
}

export async function updatePasswordController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = req.authUser;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const parsed = updatePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: parsed.error.issues.map((i) => i.message),
      });
    }

    const { currentPassword, newPassword } = parsed.data;

    try {
      await updateUserPassword(user.sub, currentPassword, newPassword);
      return res.status(204).send();
    } catch (err) {
      if (err instanceof GoogleAccountNotAllowedError) {
        return res.status(403).json({
          message: 'Password change is not allowed for Google sign-in accounts',
        });
      }
      if (err instanceof InvalidPasswordError) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }
      if (err instanceof Error && err.message === 'USER_NOT_FOUND') {
        return res.status(404).json({ message: 'User not found' });
      }
      throw err;
    }
  } catch (err) {
    return next(err);
  }
}

export async function deleteAccountController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = req.authUser;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
      await deleteUserAccount(user.sub);
      return res.status(204).send();
    } catch (err) {
      if (err instanceof Error && err.message === 'USER_NOT_FOUND') {
        return res.status(404).json({ message: 'User not found' });
      }
      throw err;
    }
  } catch (err) {
    return next(err);
  }
}

export async function meController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authUser = req.authUser;
    if (!authUser) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.sub },
      select: { id: true, email: true, name: true, googleId: true, createdAt: true },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json(user);
  } catch (err) {
    return next(err);
  }
}

export async function verifyEmailController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.query.token as string | undefined;
    if (!token) {
      return res.status(400).json({ message: 'Missing token' });
    }

    try {
      const user = await verifyEmailFromToken(token);
      return res.status(200).json({
        message: 'Email verified successfully.',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified,
        },
      });
    } catch (err) {
      if (err instanceof InvalidOrExpiredVerificationTokenError) {
        return res.status(400).json({ message: 'Invalid or expired token' });
      }
      if (err instanceof UserNotFoundError) {
        return res.status(404).json({ message: 'User not found' });
      }
      throw err;
    }
  } catch (err) {
    return next(err);
  }
}