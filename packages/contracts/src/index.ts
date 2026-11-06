export const API_PATHS = {
  health: "/api/health",
} as const;

export type HealthResponse = {
  status: "ok";
  service: "fabrica-api";
  version: string;
};
