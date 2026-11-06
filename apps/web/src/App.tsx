import { useEffect, useState } from "react";
import { API_PATHS } from "@fabrica/contracts/health";
import type { HealthResponse } from "@fabrica/contracts/health";
import { CreateCasePage } from "./features/case-creation/CreateCasePage";
import { InvestigationHandoff } from "./features/case-creation/InvestigationHandoff";

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
    window.addEventListener("popstate", handleNavigation);
    void checkApi();
    return () => {
      controller.abort();
      window.removeEventListener("popstate", handleNavigation);
    };
  }, []);

  function openInvestigation(caseId: string) {
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
          onCaseReady={openInvestigation}
        />
      ) : (
        <InvestigationHandoff
          caseId={route.caseId}
          onCreateAnother={returnToCreation}
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
