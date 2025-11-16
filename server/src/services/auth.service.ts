import { PrismaClient, Prisma } from '../../prisma/.prisma/client';
import type { SignupRequestDTO, SignupResponseDTO } from '../types/auth.types';
import bcrypt from 'bcryptjs';
import type { SignupInput } from '../validations/auth.validation';
import { EmailAlreadyExistsError } from '../errors/auth.error';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

export async function signupLocal(data: SignupRequestDTO): Promise<SignupResponseDTO> {
  const { email, password, name } = data;

  if (!password) {
    throw new Error('Password is required');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  try{
      const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash
    },
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
  }catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      if (Array.isArray(err.meta?.target) && err.meta?.target.includes('email')) {
        throw new EmailAlreadyExistsError();
      }

      throw new EmailAlreadyExistsError();
    }
    throw err;
  }
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
  };
}
