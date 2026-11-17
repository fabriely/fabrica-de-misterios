import { useEffect, useState } from "react";
import type { AiOperation, CaseInsights } from "@fabrica/contracts";
import { getInsights } from "../../api/cases";
import { readSavedCases, type SavedCase } from "../../case-library";
import "./cost-log.css";

type Entry = { saved: SavedCase; insights: CaseInsights | null; error: boolean };
const money = (value: number) => `US$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 5, maximumFractionDigits: 5 })}`;
const labels: Record<AiOperation["stage"], string> = {
  premises: "Premissas", case_text: "Texto do caso", scene_image: "Imagem da cena",
  portraits_image: "Retratos", visual_review: "Juiz visual", quality_review: "Revisão de qualidade", accusation_judgment: "Julgamento",
};

export function CostLogPage({ onOpenCase }: { onOpenCase: (caseId: string) => void }) {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void Promise.all(readSavedCases().map(async (saved): Promise<Entry> => {
      try { return { saved, insights: await getInsights(saved.caseId, controller.signal), error: false }; }
      catch { return { saved, insights: null, error: true }; }
    })).then((result) => { if (!controller.signal.aborted) setEntries(result); });
    return () => controller.abort();
  }, [refresh]);

  const operations = entries?.flatMap((entry) => entry.insights?.operations ?? []) ?? [];
  const priced = operations.filter((op) => op.estimatedCostUsd !== null);
  const knownTotal = priced.reduce((sum, op) => sum + (op.estimatedCostUsd ?? 0), 0);
  const unknown = operations.filter((op) => op.estimatedCostUsd === null).length;
  const unavailable = entries?.filter((entry) => entry.error).length ?? 0;
  const byStage = Object.entries(labels).map(([stage, label]) => ({ stage, label, items: operations.filter((op) => op.stage === stage) })).filter((group) => group.items.length);
  const maxStageCost = Math.max(0.00001, ...byStage.map((group) => group.items.reduce((sum, op) => sum + (op.estimatedCostUsd ?? 0), 0)));

  return <main className="cost-page">
    <div className="cost-heading"><div><span className="kicker">LIVRO-CAIXA · INTELIGÊNCIA ARTIFICIAL</span><h1>Custos dos mistérios</h1><p>Um registro das operações de IA dos casos salvos neste navegador.</p></div><button className="secondary-button" onClick={() => { setEntries(null); setRefresh((n) => n + 1); }}>Atualizar registros</button></div>
    <section className="cost-hero" aria-label="Resumo dos custos"><div><span className="cost-eyebrow">TOTAL CONHECIDO</span><strong>{priced.length === 0 ? "—" : money(knownTotal)}</strong><p>{priced.length === 0 && entries !== null ? "Nenhuma operação com preço calculado" : "Estimativa em dólares"} · {entries?.filter((entry) => !entry.error).length ?? 0} caso(s) consultado(s)</p></div><div className="cost-hero-side"><span><b>{operations.length}</b> operações registradas</span><span><b>{unknown}</b> sem preço calculado</span><span><b>{unavailable}</b> caso(s) indisponível(is)</span></div></section>
    {(unknown > 0 || unavailable > 0) && <p className="cost-notice">O total acima é parcial. Operações sem preço ou casos indisponíveis podem ter gerado cobrança.</p>}
    <div className="cost-columns"><section className="cost-panel"><div className="cost-panel-title"><span className="kicker">DISTRIBUIÇÃO</span><h2>Por etapa</h2></div>{byStage.length ? byStage.map((group) => { const amount = group.items.reduce((sum, op) => sum + (op.estimatedCostUsd ?? 0), 0); const hasPrice = group.items.some((op) => op.estimatedCostUsd !== null); return <div className="cost-stage" key={group.stage}><div><span>{group.label}</span><strong>{hasPrice ? money(amount) : "—"}</strong></div><div className="cost-bar"><i style={{ width: `${hasPrice ? Math.max(2, amount / maxStageCost * 100) : 0}%` }} /></div><small>{group.items.length} operação(ões) · {group.items.filter((op) => op.estimatedCostUsd === null).length} sem preço</small></div>; }) : <p className="cost-empty">Ainda não há operações registradas.</p>}</section>
      <section className="cost-panel"><div className="cost-panel-title"><span className="kicker">ARQUIVO</span><h2>Por mistério</h2></div>{entries === null ? <p className="cost-empty">Carregando registros…</p> : entries.length === 0 ? <p className="cost-empty">Nenhum caso salvo neste navegador. Crie ou abra um mistério para acompanhar seus custos aqui.</p> : entries.map(({ saved, insights, error }, index) => <button className="cost-case" key={saved.caseId} onClick={() => onOpenCase(saved.caseId)}><span className="cost-index">{String(index + 1).padStart(2, "0")}</span><span className="cost-case-name"><strong>{saved.premiseTitle ?? `Caso ${saved.caseId.slice(0, 8)}`}</strong><small>{new Date(saved.savedAt).toLocaleDateString("pt-BR")} · {insights?.operations.length ?? 0} operações</small></span><span className="cost-case-total">{error ? "Indisponível" : insights?.estimatedCostUsd == null ? insights?.operations.some((op) => op.estimatedCostUsd !== null) ? money(insights.operations.reduce((sum, op) => sum + (op.estimatedCostUsd ?? 0), 0)) + "*" : "Sem preço" : money(insights.estimatedCostUsd)}</span></button>)}</section></div>
    <section className="cost-panel cost-ledger"><div className="cost-panel-title"><span className="kicker">HISTÓRICO DETALHADO</span><h2>Cada operação</h2></div><div className="cost-table-wrap"><table><thead><tr><th>Data</th><th>Etapa</th><th>Modelo</th><th>Tokens</th><th>Estado</th><th>Custo estimado</th></tr></thead><tbody>{operations.slice().sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).map((op) => <tr key={op.id}><td>{new Date(op.occurredAt).toLocaleString("pt-BR")}</td><td>{labels[op.stage]}</td><td>{op.model}</td><td>{op.totalTokens?.toLocaleString("pt-BR") ?? "—"}</td><td><span className={op.status === "failed" ? "cost-status failed" : "cost-status"}>{op.status === "failed" ? "Falhou" : "Concluída"}</span></td><td>{op.estimatedCostUsd === null ? "Não precificado" : money(op.estimatedCostUsd)}</td></tr>)}</tbody></table>{operations.length === 0 && <p className="cost-empty">As operações aparecerão aqui quando houver casos com métricas.</p>}</div></section>
    <p className="cost-footnote">* Total parcial. Valores são estimativas baseadas nas tarifas configuradas no servidor e podem diferir da fatura da OpenAI. Operações antigas não são recalculadas automaticamente.</p>
  </main>;
}
