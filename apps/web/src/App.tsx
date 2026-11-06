import { useEffect, useState } from "react";
import { API_PATHS } from "@fabrica/contracts/health";
import type { HealthResponse } from "@fabrica/contracts/health";

type ApiState =
  | { kind: "loading" }
  | { kind: "online"; data: HealthResponse }
  | { kind: "offline" };

export function App() {
  const [apiState, setApiState] = useState<ApiState>({ kind: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    async function checkApi() {
      try {
        const response = await fetch(API_PATHS.health, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`A API respondeu com status ${response.status}.`);
        }

        const data = (await response.json()) as HealthResponse;
        setApiState({ kind: "online", data });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setApiState({ kind: "offline" });
      }
    }

    void checkApi();
    return () => controller.abort();
  }, []);

  return (
    <main className="shell">
      <section className="intro-card">
        <span className="eyebrow">FUNDAÇÃO DO PROJETO</span>
        <h1>Fábrica de Mistérios</h1>
        <p>
          A base da nova aplicação está pronta para receber configuração,
          persistência e geração de casos.
        </p>

        <div className={`health health-${apiState.kind}`} role="status">
          <span className="health-dot" aria-hidden="true" />
          {apiState.kind === "loading" && "Consultando a API..."}
          {apiState.kind === "offline" && "API indisponível"}
          {apiState.kind === "online" && (
            <>
              API conectada <small>v{apiState.data.version}</small>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
