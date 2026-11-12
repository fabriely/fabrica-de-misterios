import { useEffect, useState } from "react";
import { API_PATHS } from "@fabrica/contracts/health";
import type { HealthResponse } from "@fabrica/contracts/health";
import type { CaseStatusResponse } from "@fabrica/contracts";
import { getCaseStatus, PublicApiError } from "./api/cases";
import { CreateCasePage } from "./features/case-creation/CreateCasePage";
import { GenerationProgress } from "./features/case-creation/GenerationProgress";
import { InvestigationPage } from "./features/investigation/InvestigationPage";

type ApiState =
  | { kind: "loading" }
  | { kind: "online"; data: HealthResponse }
  | { kind: "offline" };

export function App() {
  const [apiState, setApiState] = useState<ApiState>({ kind: "loading" });
  const [route, setRoute] = useState(() => readRoute());

  useEffect(() => {
    const controller = new AbortController();

    async function checkApi() {
      try {
        const response = await fetch(API_PATHS.health, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("API indisponível");
        const data = (await response.json()) as HealthResponse;
        setApiState({ kind: "online", data });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setApiState({ kind: "offline" });
      }
    }

    const handleNavigation = () => setRoute(readRoute());
    const healthInterval = window.setInterval(() => void checkApi(), 10_000);
    window.addEventListener("popstate", handleNavigation);
    void checkApi();
    return () => {
      controller.abort();
      window.clearInterval(healthInterval);
      window.removeEventListener("popstate", handleNavigation);
    };
  }, []);

  function openCase(caseId: string) {
    window.history.pushState({}, "", `/cases/${caseId}`);
    setRoute({ kind: "investigation" as const, caseId });
  }

  function returnToCreation() {
    window.history.pushState({}, "", "/");
    setRoute({ kind: "creation" });
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" type="button" onClick={returnToCreation}>
          <span className="brand-mark" aria-hidden="true">FM</span>
          <span>
            <strong>Fábrica de Mistérios</strong>
            <small>Arquivo de casos extraordinários</small>
          </span>
        </button>

        <div className={`health health-${apiState.kind}`} role="status">
          <span className="health-dot" aria-hidden="true" />
          {apiState.kind === "loading" && "Conectando"}
          {apiState.kind === "offline" && "API indisponível"}
          {apiState.kind === "online" && (
            <>
              Sistema online <small>v{apiState.data.version}</small>
            </>
          )}
        </div>
      </header>

      {route.kind === "creation" ? (
        <CreateCasePage
          apiAvailable={apiState.kind === "online"}
          onCaseCreated={openCase}
        />
      ) : (
        <CaseRoutePage
          caseId={route.caseId}
          onReturnHome={returnToCreation}
        />
      )}

      <footer className="footer">
        <span>Casos fictícios gerados para investigação</span>
        <span aria-hidden="true">◆</span>
        <span>Uma acusação. Uma chance.</span>
      </footer>
    </div>
  );
}

function CaseRoutePage({ caseId, onReturnHome }: { caseId: string; onReturnHome: () => void }) {
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "status"; status: CaseStatusResponse }
    | { kind: "error"; message: string }
  >({ kind: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    let timer: number | undefined;
    async function poll() {
      try {
        const status = await getCaseStatus(caseId, controller.signal);
        if (controller.signal.aborted) return;
        setState({ kind: "status", status });
        if (status.status !== "ready" && status.status !== "failed") {
          timer = window.setTimeout(() => void poll(), 1_000);
        }
      } catch (cause) {
        if (controller.signal.aborted) return;
        setState({ kind: "error", message: cause instanceof PublicApiError ? cause.message : "Não foi possível consultar este caso." });
      }
    }
    void poll();
    return () => { controller.abort(); if (timer !== undefined) window.clearTimeout(timer); };
  }, [caseId]);

  if (state.kind === "loading") return <main className="investigation-loading"><h1>Localizando o caso...</h1></main>;
  if (state.kind === "error" || state.status.status === "failed") {
    const message = state.kind === "error" ? state.message : state.status.errorMessage ?? "A geração falhou.";
    return <main className="investigation-message-page"><section className="investigation-message"><h1>Não foi possível abrir o caso</h1><p>{message}</p><button className="primary-button" type="button" onClick={onReturnHome}>Criar outro caso</button></section></main>;
  }
  if (state.status.status !== "ready") return <GenerationProgress status={state.status} />;
  return <InvestigationPage caseId={caseId} onReturnHome={onReturnHome} />;
}

type AppRoute =
  | { kind: "creation" }
  | { kind: "investigation"; caseId: string };

function readRoute(): AppRoute {
  const match = window.location.pathname.match(
    /^\/cases\/([0-9a-f-]{36})\/?$/i,
  );
  return match?.[1]
    ? { kind: "investigation", caseId: match[1] }
    : { kind: "creation" };
}
