import { z } from 'zod';

export const nameSchema = z.string().trim().min(2).max(100);

// Tira espacos, poe em minusculas e so depois confere o formato.
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .regex(z.regexes.email, 'Invalid email');

export const passwordSchema = z.string().min(15).max(128);
