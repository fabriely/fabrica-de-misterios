import { z } from "zod";

export const entityIdSchema = z
  .string()
  .regex(/^[a-z][a-z0-9_]{1,63}$/);

export const caseIdSchema = z.string().uuid();
export const timestampSchema = z.string().datetime({ offset: true });

export const shortTextSchema = z.string().trim().min(1).max(160);
export const paragraphSchema = z.string().trim().min(1).max(2_000);
export const longTextSchema = z.string().trim().min(1).max(8_000);
