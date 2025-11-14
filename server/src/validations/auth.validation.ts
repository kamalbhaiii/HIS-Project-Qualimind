import { z } from 'zod';

export const signupSchema = z.object({
  email: z
    .string()
    .email({ message: 'Invalid email format' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters long' }),
  name: z
    .string()
    .min(1, { message: 'Name cannot be empty' })
    .max(100)
    .optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;
