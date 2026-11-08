import type { CaseGenerationStatus, CaseStatusResponse } from "@fabrica/contracts";

type GenerationProgressProps = {
  status: CaseStatusResponse;
};

const steps: Array<{
  status: CaseGenerationStatus;
  label: string;
  detail: string;
}> = [
  { status: "queued", label: "Abrindo o arquivo", detail: "Organizando seu briefing" },
  { status: "generating_case", label: "Escrevendo o mistério", detail: "Criando suspeitos e documentos" },
  { status: "generating_image", label: "Revelando a cena", detail: "Preparando a imagem e as pistas" },
  { status: "ready", label: "Caso pronto", detail: "Lacrando o dossiê" },
];

export function GenerationProgress({ status }: GenerationProgressProps) {
  const currentIndex = steps.findIndex((step) => step.status === status.status);
  const visibleProgress = Math.max(status.progress, 4);

  return (
    <main className="generation-page" aria-live="polite">
      <section className="generation-card">
        <div className="document-stack" aria-hidden="true">
          <span />
          <span />
          <div className="document-front">
            <b>CONFIDENCIAL</b>
            <i>◆</i>
            <small>ARQUIVO EM PREPARAÇÃO</small>
          </div>
        </div>

        <span className="kicker">A FÁBRICA ESTÁ TRABALHANDO</span>
        <h1>Seu mistério está tomando forma</h1>
        <p>Não feche esta janela. O dossiê será aberto assim que estiver pronto.</p>

        <div className="progress-track" aria-label={`${status.progress}% concluído`}>
          <span style={{ width: `${visibleProgress}%` }} />
        </div>
        <strong className="progress-value">{status.progress}%</strong>

        <ol className="generation-steps">
          {steps.map((step, index) => {
            const state = index < currentIndex ? "done" : index === currentIndex ? "active" : "waiting";
            return (
              <li className={`step-${state}`} key={step.status}>
                <span>{state === "done" ? "✓" : index + 1}</span>
                <div>
                  <strong>{step.label}</strong>
                  <small>{step.detail}</small>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </main>
  );
}
