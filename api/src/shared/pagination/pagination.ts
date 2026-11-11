import { z } from 'zod';

export type Paginated<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
};

// page e limit chegam como texto na URL; coerce converte para numero.
export const paginationSchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type Pagination = z.infer<typeof paginationSchema>;
