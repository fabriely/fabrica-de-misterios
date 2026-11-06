export const API_PATHS = {
  health: "/api/health",
  cases: "/api/cases",
  case: (caseId: string) => `/api/cases/${caseId}`,
  caseStatus: (caseId: string) => `/api/cases/${caseId}/status`,
} as const;

export type HealthResponse = {
  status: "ok";
  service: "fabrica-api";
  version: string;
};
