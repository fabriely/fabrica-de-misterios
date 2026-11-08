import type { AccusationResult, PublicCase } from "@fabrica/contracts";
import { documentTypeLabel } from "./labels";

type CaseRevealProps = {
  dossier: PublicCase;
  reveal: AccusationResult;
  onBack: () => void;
  onCreateAnother: () => void;
};

export function CaseReveal({
  dossier,
  reveal,
  onBack,
  onCreateAnother,
}: CaseRevealProps) {
  const culprit = dossier.suspects.find(
    (suspect) => suspect.id === reveal.culpritId,
  );
  const evidence = reveal.decisiveEvidenceIds.map((evidenceId) => {
    const document = dossier.documents.find((item) => item.id === evidenceId);
    if (document) {
      return {
        id: document.id,
        kind: documentTypeLabel(document.type),
        title: document.title,
        description: document.summary,
      };
    }
    const clue = dossier.scene.visibleClues.find((item) => item.id === evidenceId);
    return clue
      ? {
          id: clue.id,
          kind: "Pista visual",
          title: clue.label,
          description: clue.description,
        }
      : {
          id: evidenceId,
          kind: "Evidência",
          title: evidenceId,
          description: "Evidência registrada na solução do caso.",
        };
  });

  return (
    <main className="reveal-page">
      <header className="reveal-topbar">
        <button className="back-link" type="button" onClick={onBack}>
          <span aria-hidden="true">←</span> Voltar ao dossiê
        </button>
        <span>ARQUIVO {dossier.id.slice(0, 8).toUpperCase()} · SOLUCIONADO</span>
      </header>

      <section className="reveal-hero">
        <span className={`verdict-seal ${reveal.correct ? "correct" : "incorrect"}`}>
          {reveal.correct ? "ACUSAÇÃO CORRETA" : "ACUSAÇÃO INCORRETA"}
        </span>
        <span className="kicker">A VERDADE DO CASO</span>
        <h1>{dossier.title}</h1>
        <p>
          Depois de confrontar os depoimentos, horários e evidências, esta é a
          reconstrução definitiva dos acontecimentos.
        </p>
      </section>

      <section className="culprit-reveal">
        <div className="culprit-portrait" aria-hidden="true">
          <span>{initials(reveal.culpritName)}</span>
          <small>IDENTIFICADO</small>
        </div>
        <div>
          <span className="section-label">O CULPADO ERA</span>
          <h2>{reveal.culpritName}</h2>
          <strong>{culprit?.role ?? "Suspeito do caso"}</strong>
          <p>{culprit?.relationshipToCase}</p>
        </div>
        <div className="player-verdict">
          <span>Sua acusação</span>
          <strong>{reveal.accusedName}</strong>
          <small>{reveal.correct ? "Você acertou." : "Você não acertou."}</small>
        </div>
      </section>

      <div className="reveal-facts">
        <article>
          <span className="fact-symbol" aria-hidden="true">M</span>
          <div><span className="section-label">MOTIVO</span><h3>Por que fez isso</h3><p>{reveal.motive}</p></div>
        </article>
        <article>
          <span className="fact-symbol" aria-hidden="true">C</span>
          <div><span className="section-label">MÉTODO</span><h3>Como aconteceu</h3><p>{reveal.method}</p></div>
        </article>
      </div>

      <section className="reveal-timeline">
        <div className="reveal-section-heading">
          <span className="section-label">RECONSTRUÇÃO</span>
          <h2>Linha do tempo</h2>
          <p>A sequência dos acontecimentos que resolveu o mistério.</p>
        </div>
        <ol>
          {reveal.timeline.map((event, index) => (
            <li key={`${event.time}_${index}`}>
              <span className="timeline-time">{event.time}</span>
              <span className="timeline-dot" aria-hidden="true" />
              <div><small>ETAPA {String(index + 1).padStart(2, "0")}</small><p>{event.event}</p></div>
            </li>
          ))}
        </ol>
      </section>

      <section className="decisive-evidence">
        <div className="reveal-section-heading">
          <span className="section-label">PROVAS DECISIVAS</span>
          <h2>O que demonstrava a verdade</h2>
          <p>Estas evidências públicas conectavam o culpado ao crime.</p>
        </div>
        <div>
          {evidence.map((item, index) => (
            <article key={item.id}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <small>{item.kind}</small>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="final-explanation">
        <span className="section-label">CONCLUSÃO DO INVESTIGADOR-CHEFE</span>
        <blockquote>{reveal.explanation}</blockquote>
      </section>

      <section className="reveal-actions">
        <div><span className="kicker">CASO ENCERRADO</span><h2>Pronto para outro mistério?</h2></div>
        <div>
          <button className="secondary-button" type="button" onClick={onBack}>Rever o dossiê</button>
          <button className="primary-button" type="button" onClick={onCreateAnother}>Criar novo caso</button>
        </div>
      </section>
    </main>
  );
}

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}
