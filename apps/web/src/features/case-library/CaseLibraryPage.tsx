import { useEffect, useState } from "react";
import type { CaseStatusResponse, PublicCase } from "@fabrica/contracts";
import { getCase, getCaseStatus, PublicApiError } from "../../api/cases";
import { caseIdFromInput, readSavedCases, saveCase } from "../../case-library";

type CaseDetails =
  | { kind: "loading" }
  | { kind: "found"; status: CaseStatusResponse; dossier: PublicCase | null }
  | { kind: "error"; message: string };

type Props = {
  onOpenCase: (caseId: string) => void;
  onCreateCase: () => void;
};

export function CaseLibraryPage({ onOpenCase, onCreateCase }: Props) {
  const [savedCases, setSavedCases] = useState(readSavedCases);
  const [details, setDetails] = useState<Record<string, CaseDetails>>({});
  const [refreshKey, setRefreshKey] = useState(0);
  const [link, setLink] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let timer: number | undefined;

    async function refresh() {
      const results = await Promise.all(savedCases.map(async (saved): Promise<[string, CaseDetails]> => {
        try {
          const status = await getCaseStatus(saved.caseId, controller.signal);
          const dossier = status.status === "ready" ? await getCase(saved.caseId, controller.signal) : null;
          return [saved.caseId, { kind: "found", status, dossier }];
        } catch (cause) {
          return [saved.caseId, {
            kind: "error",
            message: cause instanceof PublicApiError && cause.status === 404
              ? "Caso não encontrado."
              : "Não foi possível consultar este caso agora.",
          }];
        }
      }));
      if (controller.signal.aborted) return;
      setDetails(Object.fromEntries(results));
      if (results.some(([, value]) => value.kind === "found" && isGenerating(value.status.status))) {
        timer = window.setTimeout(() => void refresh(), 5_000);
      }
    }

    void refresh();
    return () => { controller.abort(); if (timer !== undefined) window.clearTimeout(timer); };
  }, [savedCases, refreshKey]);

  async function importCase(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const caseId = caseIdFromInput(link);
    if (!caseId) {
      setImportError("Cole um link de caso ou um ID válido.");
      return;
    }
    setImporting(true);
    setImportError(null);
    try {
      await getCaseStatus(caseId);
      if (!saveCase(caseId)) throw new Error("storage_unavailable");
      setSavedCases(readSavedCases());
      setLink("");
    } catch (cause) {
      setImportError(cause instanceof PublicApiError
        ? cause.status === 404 ? "Não encontramos esse caso." : cause.message
        : "Não foi possível salvar o caso neste navegador.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <main className="library-layout">
      <section className="library-intro">
        <span className="kicker">ARQUIVO PESSOAL</span>
        <h1>Casos neste navegador</h1>
        <p>Retome as investigações criadas ou abertas aqui. Seus casos ficam salvos neste navegador, sem revelar a solução.</p>
        <button className="primary-button" type="button" onClick={onCreateCase}>Criar novo caso</button>
      </section>

      <form className="library-import" onSubmit={(event) => void importCase(event)}>
        <label htmlFor="case-link">Tem o link de um caso anterior?</label>
        <div>
          <input id="case-link" value={link} onChange={(event) => setLink(event.target.value)} placeholder="Cole o link ou o ID do caso" disabled={importing} />
          <button className="secondary-button" type="submit" disabled={importing}>{importing ? "Buscando..." : "Adicionar"}</button>
        </div>
        {importError && <p className="form-error" role="alert">{importError}</p>}
      </form>

      <section className="library-section" aria-labelledby="library-title">
        <div className="library-section-heading">
          <h2 id="library-title">Seus arquivos <span>{savedCases.length}</span></h2>
          {savedCases.length > 0 && <button className="library-refresh" type="button" onClick={() => setRefreshKey((key) => key + 1)}>Atualizar estados</button>}
        </div>
        {savedCases.length === 0 ? (
          <div className="library-empty"><span aria-hidden="true">◇</span><p>Nenhum caso salvo ainda. Crie um mistério ou adicione um link para começar o arquivo.</p></div>
        ) : (
          <div className="library-grid">
            {savedCases.map((saved, index) => {
              const detail = details[saved.caseId] ?? { kind: "loading" };
              const title = detail.kind === "found" && detail.dossier ? detail.dossier.title : saved.premiseTitle ?? `Caso ${saved.caseId.slice(0, 8)}`;
              const date = detail.kind === "found" && detail.dossier ? detail.dossier.createdAt : saved.savedAt;
              return (
                <article className="library-card" key={saved.caseId}>
                  <div className="library-card-top"><span>ARQUIVO {String(index + 1).padStart(2, "0")}</span><span className={`library-status ${detail.kind === "found" ? `library-status-${detail.status.status}` : ""}`}>{statusLabel(detail)}</span></div>
                  <h3>{title}</h3>
                  {detail.kind === "found" && detail.dossier && <p>{detail.dossier.synopsis}</p>}
                  {detail.kind === "error" && <p>{detail.message}</p>}
                  <div className="library-card-bottom"><span>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(date))}</span><button type="button" onClick={() => onOpenCase(saved.caseId)}>Abrir caso →</button></div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

function isGenerating(status: CaseStatusResponse["status"]) {
  return status === "queued" || status === "generating_case" || status === "generating_image";
}

function statusLabel(detail: CaseDetails): string {
  if (detail.kind === "loading") return "Consultando";
  if (detail.kind === "error") return "Indisponível";
  if (detail.status.status === "ready") return "Pronto";
  if (detail.status.status === "failed") return "Falhou";
  return "Em preparação";
}
