import { useEffect, useState } from "react";
import type { CaseDocument, PublicCase } from "@fabrica/contracts";
import { getCase, PublicApiError } from "../../api/cases";
import { DocumentDialog } from "./DocumentDialog";
import {
  crimeLabels,
  difficultyLabels,
  documentTypeLabel,
  periodLabels,
  toneLabels,
} from "./labels";

type InvestigationPageProps = {
  caseId: string;
  onReturnHome: () => void;
};

type InvestigationView = "overview" | "suspects" | "documents";

type LoadState =
  | { kind: "loading" }
  | { kind: "loaded"; dossier: PublicCase }
  | { kind: "error"; message: string };

export function InvestigationPage({
  caseId,
  onReturnHome,
}: InvestigationPageProps) {
  const [loadState, setLoadState] = useState<LoadState>({ kind: "loading" });
  const [view, setView] = useState<InvestigationView>("overview");
  const [selectedDocument, setSelectedDocument] = useState<CaseDocument | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoadState({ kind: "loading" });
    void getCase(caseId, controller.signal)
      .then((dossier) => setLoadState({ kind: "loaded", dossier }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({
          kind: "error",
          message:
            error instanceof PublicApiError
              ? error.message
              : "Não foi possível abrir este dossiê.",
        });
      });
    return () => controller.abort();
  }, [caseId, reloadKey]);

  if (loadState.kind === "loading") {
    return <InvestigationLoading />;
  }

  if (loadState.kind === "error") {
    return (
      <main className="investigation-message-page">
        <section className="investigation-message">
          <span className="message-symbol" aria-hidden="true">!</span>
          <span className="kicker">ARQUIVO INDISPONÍVEL</span>
          <h1>Não conseguimos abrir o caso</h1>
          <p>{loadState.message}</p>
          <div>
            <button className="secondary-button" type="button" onClick={onReturnHome}>
              Voltar ao início
            </button>
            <button
              className="primary-button"
              type="button"
              onClick={() => setReloadKey((value) => value + 1)}
            >
              Tentar novamente
            </button>
          </div>
        </section>
      </main>
    );
  }

  const dossier = loadState.dossier;
  return (
    <main className="investigation-page">
      <header className="dossier-header">
        <button className="back-link" type="button" onClick={onReturnHome}>
          <span aria-hidden="true">←</span> Novo caso
        </button>
        <div className="dossier-reference">
          <span>ARQUIVO {dossier.id.slice(0, 8).toUpperCase()}</span>
          <span>ABERTO EM {formatDate(dossier.createdAt)}</span>
        </div>
        <span className="classification">CONFIDENCIAL</span>
      </header>

      <section className="dossier-title-block">
        <div>
          <span className="kicker">CASO EM INVESTIGAÇÃO</span>
          <h1>{dossier.title}</h1>
          <p>{dossier.synopsis}</p>
        </div>
        <dl className="case-facts">
          <div><dt>Ocorrência</dt><dd>{crimeLabels[dossier.briefing.crimeType]}</dd></div>
          <div><dt>Período</dt><dd>{dossier.briefing.customPeriod ?? periodLabels[dossier.briefing.period]}</dd></div>
          <div><dt>Dificuldade</dt><dd>{difficultyLabels[dossier.briefing.difficulty]}</dd></div>
          <div><dt>Tom</dt><dd>{toneLabels[dossier.briefing.tone]}</dd></div>
        </dl>
      </section>

      <nav className="dossier-tabs" aria-label="Seções do dossiê">
        <TabButton active={view === "overview"} onClick={() => setView("overview")}>
          Visão geral
        </TabButton>
        <TabButton active={view === "suspects"} onClick={() => setView("suspects")}>
          Suspeitos <span>{dossier.suspects.length}</span>
        </TabButton>
        <TabButton active={view === "documents"} onClick={() => setView("documents")}>
          Documentos <span>{dossier.documents.length}</span>
        </TabButton>
      </nav>

      {view === "overview" && <Overview dossier={dossier} />}
      {view === "suspects" && <Suspects dossier={dossier} />}
      {view === "documents" && (
        <Documents dossier={dossier} onOpen={setSelectedDocument} />
      )}

      <section className="accusation-preview">
        <div>
          <span className="kicker">CONCLUSÃO DA INVESTIGAÇÃO</span>
          <h2>Já sabe quem é o culpado?</h2>
          <p>Revise todas as evidências. Quando acusar alguém, não haverá segunda chance.</p>
        </div>
        <button className="locked-button" type="button" disabled>
          <span aria-hidden="true">◇</span> Fazer acusação · em breve
        </button>
      </section>

      {selectedDocument && (
        <DocumentDialog
          document={selectedDocument}
          onClose={() => setSelectedDocument(null)}
        />
      )}
    </main>
  );
}

function Overview({ dossier }: { dossier: PublicCase }) {
  const notesKey = `mystery_notes_${dossier.id}`;
  const [notes, setNotes] = useState(() => readNotes(notesKey));

  function updateNotes(value: string) {
    setNotes(value);
    try {
      localStorage.setItem(notesKey, value);
    } catch {
      // The notes remain usable for this session when storage is unavailable.
    }
  }

  return (
    <section className="overview-grid">
      <div className="scene-column">
        <article className="scene-card">
          <div className="scene-image-wrap">
            <img src={dossier.scene.imageUrl} alt={dossier.scene.imageAlt} />
            <span>CENA PRINCIPAL · EVIDÊNCIA VISUAL</span>
          </div>
          <div className="scene-copy">
            <span className="section-label">LOCAL DA OCORRÊNCIA</span>
            <h2>{dossier.briefing.setting}</h2>
            <p>{dossier.scene.description}</p>
          </div>
        </article>

        <article className="incident-card">
          <span className="section-label">RESUMO DO INCIDENTE</span>
          <p>{dossier.incident}</p>
        </article>

        <section className="visual-clues">
          <div className="content-heading">
            <div>
              <span className="section-label">OBSERVAÇÕES DA CENA</span>
              <h2>Pistas visíveis</h2>
            </div>
            <span>{dossier.scene.visibleClues.length} registrada{dossier.scene.visibleClues.length === 1 ? "" : "s"}</span>
          </div>
          <div className="clue-list">
            {dossier.scene.visibleClues.map((clue, index) => (
              <article key={clue.id}>
                <span className="clue-index">{String(index + 1).padStart(2, "0")}</span>
                <div><h3>{clue.label}</h3><p>{clue.description}</p></div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <aside className="investigator-sidebar">
        <section className="instructions-card">
          <span className="section-label">ORIENTAÇÃO</span>
          <h2>Como investigar</h2>
          <p>{dossier.investigationInstructions}</p>
        </section>
        <label className="notes-card">
          <span className="section-label">CADERNO DO INVESTIGADOR</span>
          <strong>Suas anotações</strong>
          <textarea
            value={notes}
            onChange={(event) => updateNotes(event.target.value)}
            placeholder="Registre contradições, horários e suspeitas..."
            rows={10}
          />
          <small>Salvo automaticamente neste navegador</small>
        </label>
        <div className="dossier-counts">
          <div><strong>{dossier.suspects.length}</strong><span>suspeitos</span></div>
          <div><strong>{dossier.documents.length}</strong><span>documentos</span></div>
          <div><strong>{dossier.scene.visibleClues.length}</strong><span>pistas visuais</span></div>
        </div>
      </aside>
    </section>
  );
}

function Suspects({ dossier }: { dossier: PublicCase }) {
  return (
    <section className="investigation-section">
      <div className="content-heading">
        <div><span className="section-label">PESSOAS DE INTERESSE</span><h2>Suspeitos</h2></div>
        <p>Compare cada álibi com os documentos e os horários encontrados.</p>
      </div>
      <div className="suspect-grid">
        {dossier.suspects.map((suspect, index) => (
          <article className="suspect-card" key={suspect.id}>
            <header>
              <span className="suspect-photo" aria-hidden="true">{initials(suspect.name)}</span>
              <span className="suspect-number">SUSPEITO {String(index + 1).padStart(2, "0")}</span>
            </header>
            <h3>{suspect.name}</h3>
            <strong>{suspect.role}</strong>
            <p>{suspect.description}</p>
            <dl>
              <div><dt>Ligação com o caso</dt><dd>{suspect.relationshipToCase}</dd></div>
              <div><dt>Álibi declarado</dt><dd>{suspect.alibi}</dd></div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}

function Documents({ dossier, onOpen }: { dossier: PublicCase; onOpen: (document: CaseDocument) => void }) {
  return (
    <section className="investigation-section">
      <div className="content-heading">
        <div><span className="section-label">EVIDÊNCIAS DOCUMENTAIS</span><h2>Documentos do caso</h2></div>
        <p>Abra cada anexo e procure detalhes que confirmem ou contradigam os depoimentos.</p>
      </div>
      <div className="document-grid">
        {dossier.documents.map((document, index) => (
          <button className="document-card" type="button" key={document.id} onClick={() => onOpen(document)}>
            <span className="paper-clip" aria-hidden="true" />
            <span className="document-order">ANEXO {String(index + 1).padStart(2, "0")}</span>
            <span className="document-kind">{documentTypeLabel(document.type)}</span>
            <strong>{document.title}</strong>
            <p>{document.summary}</p>
            <span className="open-document">Abrir documento <b aria-hidden="true">→</b></span>
          </button>
        ))}
      </div>
    </section>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" className={active ? "active" : ""} aria-current={active ? "page" : undefined} onClick={onClick}>{children}</button>;
}

function InvestigationLoading() {
  return (
    <main className="investigation-loading" aria-live="polite">
      <div className="loading-file" aria-hidden="true"><span /><span /><span /></div>
      <span className="kicker">LOCALIZANDO ARQUIVO</span>
      <h1>Abrindo o dossiê...</h1>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
    .format(new Date(value))
    .replace(" de ", " ")
    .toUpperCase();
}

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function readNotes(key: string) {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}
