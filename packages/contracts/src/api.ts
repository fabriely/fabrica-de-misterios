import { z } from "zod";

export const apiErrorCodeSchema = z.enum([
  "invalid_request",
  "not_found",
  "case_not_ready",
  "internal_error",
]);

export const apiErrorResponseSchema = z
  .object({
    code: apiErrorCodeSchema,
    message: z.string().trim().min(1).max(300),
  })
  .strict();

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;
