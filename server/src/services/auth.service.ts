import { PrismaClient, Prisma } from '../../prisma/.prisma/client';
import { prisma } from '@loaders/prisma';
import type { SignupRequestDTO, SignupResponseDTO } from '../types/auth.types';
import bcrypt from 'bcryptjs';
import type { SignupInput } from '../validations/auth.validation';
import { AccountNotVerifiedError, EmailAlreadyExistsError, GoogleAccountNotAllowedError, InvalidOrExpiredVerificationTokenError, InvalidPasswordError, UserAlreadyVerifiedError, UserNotFoundError } from '../errors/auth.error';
import { deleteDataset } from '../services/dataset.service'; 
import { signAuthToken, verifyAuthToken } from '@utils/jwt.util';
import { buildEmailVerificationUrl } from '@utils/url.util';
import { sendAccountVerifiedMail, sendEmailVerificationMail, sendWelcomeMail } from '@utils/mail/mail.service';

const SALT_ROUNDS = 10;

export async function signupLocal(data: SignupRequestDTO): Promise<SignupResponseDTO> {
  const { email, password, name } = data;

  if (!password) {
    throw new Error('Password is required');
  }

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    if (existing.googleId) {
      // Google accounts are already verified; cannot signup using password
      throw new EmailAlreadyExistsError();
    }

    // Case B: Local account & already verified → block signup
    if (existing.emailVerified) {
      throw new EmailAlreadyExistsError();
    }

    // Not verified -> resend verification email and tell client
    const token = signAuthToken(existing); // contains user.id in sub
    const verificationUrl = buildEmailVerificationUrl(token);

    // fire-and-forget is ok, but we'll await here for clarity
    await sendEmailVerificationMail(existing, verificationUrl);

    // Let controller map this to a 409 with a clear message
    throw new AccountNotVerifiedError();
  }

  // 🔹 2) Create a new user with emailVerified = false
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      emailVerified: false,
    },
  });

  // Build verification token & URL
  const token = signAuthToken(user);
  const verificationUrl = buildEmailVerificationUrl(token);

  await sendEmailVerificationMail(user, verificationUrl);
  await sendWelcomeMail(user);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    verified: user.emailVerified
  };
}

export async function verifyEmailFromToken(token: string) {
  let payload: any;
  try {
    payload = verifyAuthToken(token);
  } catch (err) {
    throw new InvalidOrExpiredVerificationTokenError();
  }

  const userId = payload?.sub;
  if (!userId) {
    throw new InvalidOrExpiredVerificationTokenError();
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new UserNotFoundError();
  }

  if (user.emailVerified) {
    throw new UserAlreadyVerifiedError();
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
    },
  });

  // TODO: Add Email verified logic
  await sendAccountVerifiedMail(updated);

  return updated;
}

export async function loginLocal(email: string, password: string): Promise<SignupResponseDTO> {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !user.passwordHash) {
    // either no such user or user is Google-only
    throw new Error('INVALID_CREDENTIALS');
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw new Error('INVALID_CREDENTIALS');
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    verified: user.emailVerified
  };
}

export async function updateUserName(
  userId: string,
  name: string
): Promise<SignupResponseDTO> {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  if (!user.passwordHash || user.googleId) {
    throw new GoogleAccountNotAllowedError();
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { name },
  });

  return {
    id: updated.id,
    email: updated.email,
    name: updated.name,
  };
}

export async function updateUserEmail(
  userId: string,
  newEmail: string,
  currentPassword: string
): Promise<SignupResponseDTO> {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  if (!user.passwordHash || user.googleId) {
    throw new GoogleAccountNotAllowedError();
  }

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) {
    throw new InvalidPasswordError();
  }

  try {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { email: newEmail },
    });

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
    };
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      if (Array.isArray(err.meta?.target) && err.meta?.target.includes('email')) {
        throw new EmailAlreadyExistsError();
      }

      throw new EmailAlreadyExistsError();
    }
    throw err;
  }
}

export async function updateUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  if (!user.passwordHash || user.googleId) {
    throw new GoogleAccountNotAllowedError();
  }

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) {
    throw new InvalidPasswordError();
  }

  const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newHash },
  });
}

export async function deleteUserAccount(userId: string): Promise<void> {
  const datasets = await prisma.dataset.findMany({
    where: { ownerId: userId },
    select: { id: true },
  });

  for (const ds of datasets) {
    await deleteDataset(userId, ds.id);
  }

  await prisma.user.delete({
    where: { id: userId },
  });
}
