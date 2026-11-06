type InvestigationHandoffProps = {
  caseId: string;
  onCreateAnother: () => void;
};

export function InvestigationHandoff({
  caseId,
  onCreateAnother,
}: InvestigationHandoffProps) {
  return (
    <main className="handoff-page">
      <section className="handoff-card">
        <span className="handoff-seal" aria-hidden="true">✓</span>
        <span className="kicker">DOSSIÊ LACRADO</span>
        <h1>A investigação está pronta</h1>
        <p>
          O caso foi criado com sucesso. Na próxima etapa, este endereço abrirá
          os suspeitos, documentos e a cena para sua investigação.
        </p>
        <code>{caseId}</code>
        <button className="secondary-button" type="button" onClick={onCreateAnother}>
          Criar outro caso
        </button>
      </section>
    </main>
  );
}
