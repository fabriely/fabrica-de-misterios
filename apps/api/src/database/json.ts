import type { z } from "zod";
import { CorruptStoredDataError } from "./errors.js";

export function parseStoredJson<T>(
  raw: string,
  schema: z.ZodType<T>,
  entity: string,
  id: string,
): T {
  try {
    return schema.parse(JSON.parse(raw));
  } catch {
    throw new CorruptStoredDataError(entity, id);
  }
}
