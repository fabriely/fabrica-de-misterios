export const API_PATHS = {
  health: "/api/health",
  cases: "/api/cases",
  premises: "/api/premises",
  case: (caseId: string) => `/api/cases/${caseId}`,
  caseStatus: (caseId: string) => `/api/cases/${caseId}/status`,
  accusation: (caseId: string) => `/api/cases/${caseId}/accusation`,
  insights: (caseId: string) => `/api/cases/${caseId}/insights`,
  judgment: (caseId: string) => `/api/cases/${caseId}/judgment`,
  reveal: (caseId: string) => `/api/cases/${caseId}/reveal`,
} as const;

export type HealthResponse = {
  status: "ok";
  service: "fabrica-api";
  version: string;
};
