import Fastify from "fastify";
import { API_PATHS } from "@fabrica/contracts/health";
import type { HealthResponse } from "@fabrica/contracts/health";
import { apiErrorResponseSchema } from "@fabrica/contracts";
import {
  registerGameRoutes,
  type GameRoutesDependencies,
} from "./http/game-routes.js";

const API_VERSION = "0.1.0";

export type AppDependencies = {
  game?: GameRoutesDependencies;
  bodyLimitBytes?: number;
};

export function buildApp(dependencies: AppDependencies = {}) {
  const app = Fastify({
    logger: process.env.NODE_ENV !== "test",
    bodyLimit: dependencies.bodyLimitBytes ?? 32 * 1_024,
  });

  app.addHook("onSend", async (_request, reply) => {
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("X-Frame-Options", "DENY");
    reply.header("Referrer-Policy", "no-referrer");
  });

  app.setNotFoundHandler(async (_request, reply) =>
    reply.code(404).send(
      apiErrorResponseSchema.parse({
        code: "not_found",
        message: "Rota não encontrada.",
      }),
    ),
  );

  app.setErrorHandler(async (error, request, reply) => {
    const statusCode = getErrorStatusCode(error);
    if (statusCode === 400 || statusCode === 413) {
      return reply.code(statusCode).send(
        apiErrorResponseSchema.parse({
          code: "invalid_request",
          message:
            statusCode === 413
              ? "O corpo da requisição excede o limite permitido."
              : "O corpo da requisição é inválido.",
        }),
      );
    }

    request.log.error(
      {
        errorName: error instanceof Error ? error.name : "UnknownError",
        requestId: request.id,
      },
      "Erro interno não tratado",
    );
    return reply.code(500).send(
      apiErrorResponseSchema.parse({
        code: "internal_error",
        message: "Não foi possível concluir a solicitação.",
      }),
    );
  });

  app.get<{ Reply: HealthResponse }>(API_PATHS.health, async () => ({
    status: "ok",
    service: "fabrica-api",
    version: API_VERSION,
  }));

  if (dependencies.game) {
    registerGameRoutes(app, dependencies.game);
  }

  return app;
}

function getErrorStatusCode(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
  ) {
    return error.statusCode;
  }
  return null;
}
