import { useEffect, useState } from "react";
import { API_PATHS } from "@fabrica/contracts/health";
import type { HealthResponse } from "@fabrica/contracts/health";
import type { CaseStatusResponse } from "@fabrica/contracts";
import { getCaseStatus, PublicApiError } from "./api/cases";
import { CreateCasePage } from "./features/case-creation/CreateCasePage";
import { GenerationProgress } from "./features/case-creation/GenerationProgress";
import { InvestigationPage } from "./features/investigation/InvestigationPage";
import { CaseLibraryPage } from "./features/case-library/CaseLibraryPage";
import { saveCase } from "./case-library";
import { applyTheme, readTheme, saveTheme } from "./theme";

type ApiState =
  | { kind: "loading" }
  | { kind: "online"; data: HealthResponse }
  | { kind: "offline" };

export function App() {
  const [apiState, setApiState] = useState<ApiState>({ kind: "loading" });
  const [route, setRoute] = useState(() => readRoute());
  const [theme, setTheme] = useState(readTheme);

  useEffect(() => applyTheme(theme), [theme]);

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

  function openCase(caseId: string, premiseTitle?: string) {
    if (premiseTitle) saveCase(caseId, premiseTitle);
    window.history.pushState({}, "", `/cases/${caseId}`);
    setRoute({ kind: "investigation" as const, caseId });
  }

  function openLibrary() {
    window.history.pushState({}, "", "/archive");
    setRoute({ kind: "library" });
  }

  function returnToCreation() {
    window.history.pushState({}, "", "/");
    setRoute({ kind: "creation" });
  }

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    saveTheme(nextTheme);
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

        <div className="topbar-actions">
          <button className="library-nav-button" type="button" onClick={openLibrary} aria-label="Meus casos" aria-current={route.kind === "library" ? "page" : undefined}>
            <span className="library-nav-icon" aria-hidden="true">▤</span><span className="library-nav-label">Meus casos</span>
          </button>
          <button
            className="theme-toggle"
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
          >
            <span className="theme-toggle-icon" aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
            <span>{theme === "dark" ? "Modo claro" : "Modo escuro"}</span>
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
        </div>
      </header>

      {route.kind === "creation" ? (
        <CreateCasePage
          apiAvailable={apiState.kind === "online"}
          onCaseCreated={openCase}
        />
      ) : route.kind === "library" ? (
        <CaseLibraryPage onOpenCase={openCase} onCreateCase={returnToCreation} />
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
        saveCase(caseId);
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
  | { kind: "library" }
  | { kind: "investigation"; caseId: string };

function readRoute(): AppRoute {
  if (/^\/archive\/?$/.test(window.location.pathname)) return { kind: "library" };
  const match = window.location.pathname.match(
    /^\/cases\/([0-9a-f-]{36})\/?$/i,
  );
  return match?.[1]
    ? { kind: "investigation", caseId: match[1] }
    : { kind: "creation" };
}
