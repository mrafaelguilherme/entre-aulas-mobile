import { z } from 'zod';
import { paginationSchema } from '../../shared/pagination/pagination';
import {
  emailSchema,
  nameSchema,
  passwordSchema,
} from '../../shared/validation/fields';

// strictObject: role, status, password ou qualquer campo extra devolve 400.
export const createAccountSchema = z.strictObject({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const updateAccountSchema = z
  .strictObject({
    name: nameSchema.optional(),
    email: emailSchema.optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: 'At least one field must be provided',
  });

export const listAccountsSchema = paginationSchema.extend({
  status: z.enum(['pending', 'active']).optional(),
});

export const resetPasswordSchema = z.strictObject({
  password: passwordSchema,
});

export type CreateAccount = z.infer<typeof createAccountSchema>;
export type UpdateAccount = z.infer<typeof updateAccountSchema>;
export type ListAccounts = z.infer<typeof listAccountsSchema>;
export type ResetPassword = z.infer<typeof resetPasswordSchema>;
