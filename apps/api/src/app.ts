import Fastify from "fastify";
import { API_PATHS } from "@fabrica/contracts/health";
import type { HealthResponse } from "@fabrica/contracts/health";
import {
  registerGameRoutes,
  type GameRoutesDependencies,
} from "./http/game-routes.js";

const API_VERSION = "0.1.0";

export type AppDependencies = {
  game?: GameRoutesDependencies;
};

export function buildApp(dependencies: AppDependencies = {}) {
  const app = Fastify({
    logger: process.env.NODE_ENV !== "test",
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
