import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  Clipboard,
  Clock3,
  Copy,
  Eye,
  EyeOff,
  FileSearch,
  Fingerprint,
  Flag,
  KeyRound,
  MapPin,
  LockKeyhole,
  Maximize2,
  RotateCcw,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";

import type { Step, SuspectId, PremiseId, DocumentId, EvidenceId, HotspotId, TabId, Briefing, InvestigationState, Accusation, DossiePublico, SolucaoOculta, Verdict, SharedPayload } from "./demo/case";
import { EVIDENCE_TYPES, defaultBriefing, emptyInvestigation, emptyAccusation, STEPS, HOTSPOTS, EVIDENCE_LABELS, PREMISE_DETAILS, cloneBriefing, getPremises, createDossiePublico, createSolucaoOculta, validateAccusation, encodeShare, decodeShare } from "./demo/case";

function Scene({ inspected, onInspect, compact = false }: {
  inspected: HotspotId[];
  onInspect: (id: HotspotId) => void;
  compact?: boolean;
}) {
  const buttons: Array<{ id: HotspotId; number: string; left: string; top: string }> = [
    { id: "h1", number: "01", left: "24%", top: "31%" },
    { id: "h2", number: "02", left: "58%", top: "69%" },
    { id: "h3", number: "03", left: "83%", top: "28%" },
  ];
  return (
    <div className={`crime-scene ${compact ? "scene-expanded" : ""}`}>
      <svg className="scene-illustration" viewBox="0 0 900 560" role="img" aria-label="Ilustração de uma sala à noite: relógio, maleta com um cigarro, janela com tempestade e três pontos de investigação">
        <defs>
          <linearGradient id="wall" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#313d36"/><stop offset="0.55" stopColor="#202e2a"/><stop offset="1" stopColor="#111b1b"/></linearGradient>
          <linearGradient id="floor" x1="0" y1="0" x2="0.8" y2="1"><stop stopColor="#4c3c32"/><stop offset="1" stopColor="#1a1c1c"/></linearGradient>
          <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#35494e"/><stop offset="1" stopColor="#121e24"/></linearGradient>
          <radialGradient id="lamplight"><stop stopColor="#c49c5d" stopOpacity=".65"/><stop offset="1" stopColor="#c49c5d" stopOpacity="0"/></radialGradient>
          <radialGradient id="vignette"><stop offset="0.5" stopColor="#101817" stopOpacity="0"/><stop offset="1" stopColor="#050909" stopOpacity=".7"/></radialGradient>
          <pattern id="grain" width="45" height="45" patternUnits="userSpaceOnUse"><path d="M0 15H45M0 35H45" stroke="#bdab87" strokeOpacity=".055" strokeWidth="1"/></pattern>
          <pattern id="rain" width="36" height="43" patternUnits="userSpaceOnUse"><path d="M9 2l-7 20 M28 19l-7 20" stroke="#acbac0" strokeOpacity=".5" strokeWidth="1.7"/></pattern>
        </defs>
        <rect width="900" height="560" fill="url(#wall)"/>
        <rect x="0" y="355" width="900" height="205" fill="url(#floor)"/>
        <path d="M0 355H900" stroke="#9e7955" strokeOpacity=".65" strokeWidth="9"/>
        <path d="M0 379H900M0 418H900M0 490H900" stroke="#a48a69" strokeOpacity=".14" strokeWidth="2"/>
        <path d="M100 0V355M483 0V355" stroke="#a69a7c" strokeOpacity=".16" strokeWidth="8"/>
        <rect width="900" height="560" fill="url(#grain)"/>
        <ellipse cx="445" cy="290" rx="340" ry="300" fill="url(#lamplight)"/>
        <rect x="132" y="85" width="172" height="188" rx="5" fill="#171b19" stroke="#8d6d44" strokeWidth="9"/>
        <rect x="149" y="102" width="138" height="153" rx="3" fill="#cab48c" stroke="#2c251d" strokeWidth="8"/>
        <circle cx="218" cy="172" r="54" fill="#e6dac2" stroke="#5b4a33" strokeWidth="7"/>
        <circle cx="218" cy="172" r="45" fill="none" stroke="#6f604b" strokeWidth="1"/>
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i * Math.PI) / 6;
          return <line key={i} x1={218 + Math.sin(a) * 35} y1={172 - Math.cos(a) * 35} x2={218 + Math.sin(a) * 42} y2={172 - Math.cos(a) * 42} stroke="#54422d" strokeWidth="2"/>;
        })}
        <path d="M218 172l23 -20 M218 172l-2 -31" stroke="#322d26" strokeWidth="4" strokeLinecap="round"/>
        <circle cx="218" cy="172" r="4" fill="#493527"/>
        <rect x="172" y="234" width="93" height="19" rx="2" fill="#2c2c27"/>
        <text x="218" y="248" textAnchor="middle" fill="#e6ce9c" fontFamily="monospace" fontSize="17" fontWeight="bold">21:10</text>
        <rect x="680" y="65" width="150" height="250" fill="#211f1a" stroke="#a38962" strokeWidth="11"/>
        <rect x="695" y="82" width="120" height="215" fill="url(#glass)"/>
        <path d="M755 82V297 M695 188H815" stroke="#a68b6a" strokeWidth="10"/>
        <path d="M696 240l30-50 20 18 21-51 47 46v94H696z" fill="#182f2d"/>
        <rect x="695" y="82" width="120" height="215" fill="url(#rain)"/>
        <path d="M697 95l-8 25 M795 118l-8 28 M738 232l-10 24" stroke="#e6edf2" strokeOpacity=".55" strokeWidth="3"/>
        <path d="M694 82h120" stroke="#d9bf92" strokeOpacity=".2" strokeWidth="7"/>
        <path d="M534 67l-18 105M535 67l18 105" stroke="#221f1c" strokeWidth="3"/>
        <path d="M513 153h48l16 39H498z" fill="#ab8c55" stroke="#dac084" strokeWidth="3"/>
        <ellipse cx="539" cy="198" rx="98" ry="76" fill="url(#lamplight)"/>
        <rect x="65" y="242" width="66" height="97" fill="#2f3833" stroke="#665c47" strokeWidth="6"/>
        <rect x="71" y="246" width="54" height="90" fill="#434438"/>
        <path d="M80 275l35-18 M78 307l35-18" stroke="#807758" strokeWidth="4"/>
        <path d="M319 427l390-7 40 97-466 3Z" fill="#1a1717" stroke="#9c7350" strokeWidth="6"/>
        <path d="M356 436l306-6 25 50-352 4z" fill="#5e3d34" stroke="#b18b56" strokeWidth="3"/>
        <path d="M286 341l368-15 66 100-472 23z" fill="#624737" stroke="#b89966" strokeWidth="5"/>
        <path d="M272 343l373-15-34-49-287 9z" fill="#766048" stroke="#c2a375" strokeWidth="5"/>
        <path d="M322 285l284-9" stroke="#e2cba5" strokeOpacity=".55" strokeWidth="3"/>
        <rect x="367" y="328" width="155" height="79" rx="7" fill="#242e2c" stroke="#d0af74" strokeWidth="7"/>
        <path d="M385 326v-27q0-13 14-13h90q14 0 14 13v27" fill="none" stroke="#b9905f" strokeWidth="8"/>
        <rect x="386" y="339" width="119" height="55" rx="3" fill="#445047"/>
        <rect x="434" y="347" width="40" height="33" rx="3" fill="#d0c5a9" transform="rotate(12 454 365)"/>
        <path d="M416 372h76" stroke="#bd9b60" strokeWidth="3"/>
        <rect x="549" y="360" width="88" height="46" rx="3" fill="#a98d69" stroke="#cdb78e" strokeWidth="3" transform="rotate(-6 593 383)"/>
        <path d="M560 378h65M560 389h51" stroke="#70543c" strokeWidth="2"/>
        <ellipse cx="594" cy="348" rx="45" ry="13" fill="#252624" stroke="#a18b69" strokeWidth="4"/>
        <path d="M565 346q28 19 56 0" fill="#48423a" stroke="#a18b69" strokeWidth="2"/>
        <path d="M576 333l36 10" stroke="#e7d5bb" strokeWidth="10" strokeLinecap="round"/>
        <path d="M605 341l10 3" stroke="#a76156" strokeWidth="10" strokeLinecap="round"/>
        <path d="M575 324q-8-18 4-27M589 324q11-18 1-31" fill="none" stroke="#c6c4ac" strokeOpacity=".35" strokeWidth="2"/>
        <rect x="0" y="0" width="900" height="560" fill="url(#vignette)"/>
        <path d="M27 25h27M27 25v27M846 25h27M873 25v27M27 508v27h27M846 535h27v-27" fill="none" stroke="#cdb584" strokeOpacity=".6" strokeWidth="2"/>
        <text x="44" y="516" fontSize="14" fill="#d6c39d" fontFamily="monospace" letterSpacing="2">CÂMERA 01 / SALA PRINCIPAL</text>
      </svg>
      <span className="scene-rec">● REC <span>21:10</span></span>
      {buttons.map((button) => (
        <button key={button.id} type="button" onClick={() => onInspect(button.id)}
          className={`scene-pin ${inspected.includes(button.id) ? "pin-inspected" : ""}`}
          style={{ left: button.left, top: button.top }}
          aria-label={`Inspecionar ${HOTSPOTS.find((h) => h.id === button.id)?.nome}`}>
          {inspected.includes(button.id) ? <Check size={17} strokeWidth={3}/> : button.number}
        </button>
      ))}
    </div>
  );
}

const panel = "paper-card";
const primaryButton = "button button-primary";
const secondaryButton = "button button-secondary";
const inputClass = "field-input";

function Eyebrow({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return <div className={`eyebrow ${light ? "eyebrow-light" : ""}`}><span className="eyebrow-line"/>{children}</div>;
}

function Stamp({ children }: { children: React.ReactNode }) {
  return <span className="rubber-stamp">{children}</span>;
}

function PosterArt() {
  return (
    <div className="poster-art" aria-hidden="true">
      <div className="poster-circle"/>
      <div className="poster-moon"/>
      <div className="poster-house">
        <span className="poster-roof"/><span className="poster-building"/><i/><b/><em/>
      </div>
      <div className="poster-path"/>
      <div className="poster-bottomline">UM SEGREDO EM CADA SOMBRA</div>
      <div className="poster-number">Nº 001 — ARQUIVO RESERVADO</div>
    </div>
  );
}
export default function App() {
  const [linkFromHash] = useState<SharedPayload | null>(() =>
    typeof window === "undefined" ? null : decodeShare(window.location.hash)
  );
  const [currentStep, setCurrentStep] = useState<Step>(linkFromHash ? 4 : 1);
  const [furthestStep, setFurthestStep] = useState<Step>(linkFromHash ? 4 : 1);
  const [briefing, setBriefing] = useState<Briefing>(() => cloneBriefing(linkFromHash?.briefing || defaultBriefing));
  const [selectedPremiseId, setSelectedPremiseId] = useState<PremiseId>(linkFromHash?.selectedPremiseId || "prem1");
  const [investigationState, setInvestigationState] = useState<InvestigationState>(emptyInvestigation);
  const [accusation, setAccusation] = useState<Accusation>(emptyAccusation);
  const [dossiePublico, setDossiePublico] = useState<DossiePublico | null>(() =>
    linkFromHash ? createDossiePublico(linkFromHash.briefing, linkFromHash.selectedPremiseId) : null
  );
  const [solucaoOculta, setSolucaoOculta] = useState<SolucaoOculta | null>(() =>
    linkFromHash ? createSolucaoOculta(createDossiePublico(linkFromHash.briefing, linkFromHash.selectedPremiseId)) : null
  );
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [guestMode, setGuestMode] = useState(Boolean(linkFromHash));
  const [generationProgress, setGenerationProgress] = useState(0);
  const [openedDocument, setOpenedDocument] = useState<DocumentId | null>(null);
  const [focusedHotspotId, setFocusedHotspotId] = useState<HotspotId | null>(null);
  const [feedback, setFeedback] = useState("");

  const premises = useMemo(() => getPremises(briefing.cenario), [briefing.cenario]);
  const evidenceCount = investigationState.readDocuments.length + (investigationState.inspectedHotspots.length === 3 ? 1 : 0);
  const activeHotspot = HOTSPOTS.find((h) => h.id === focusedHotspotId);
  const canAccuse = Boolean(
    accusation.suspectId && accusation.mainEvidenceId && accusation.secondaryEvidenceId &&
    accusation.mainEvidenceId !== accusation.secondaryEvidenceId
  );

  function goToStep(step: Step) {
    setCurrentStep(step);
    setFurthestStep((prev) => (Math.max(prev, step) as Step));
    setFeedback("");
  }

  function invalidateCase() {
    setDossiePublico(null);
    setSolucaoOculta(null);
    setVerdict(null);
    setAccusation(emptyAccusation());
    setInvestigationState(emptyInvestigation());
    setOpenedDocument(null);
    setFocusedHotspotId(null);
    setGenerationProgress(0);
    setFurthestStep(1);
    setGuestMode(false);
  }

  function updateBriefing(next: Briefing) {
    setBriefing(next);
    invalidateCase();
  }

  function updateSuspect(id: SuspectId, field: "nome" | "relacao", value: string) {
    const next = cloneBriefing(briefing);
    next.suspeitos = next.suspeitos.map((suspect) =>
      suspect.id === id ? { ...suspect, [field]: value } : suspect
    ) as Briefing["suspeitos"];
    updateBriefing(next);
  }

  function toggleEvidenceType(tipo: string, checked: boolean) {
    const next = cloneBriefing(briefing);
    next.tiposPista = checked
      ? [...new Set([...next.tiposPista, tipo])]
      : next.tiposPista.filter((x) => x !== tipo);
    updateBriefing(next);
  }

  function finishGeneration() {
    const publicData = createDossiePublico(briefing, selectedPremiseId);
    const secret = createSolucaoOculta(publicData);
    setDossiePublico(publicData);
    setSolucaoOculta(secret);
    setInvestigationState(emptyInvestigation());
    setAccusation(emptyAccusation());
    setVerdict(null);
    setGenerationProgress(3);
    goToStep(4);
  }

  useEffect(() => {
    if (currentStep !== 3) return;
    if (generationProgress >= 3) {
      finishGeneration();
      return;
    }
    const timeout = window.setTimeout(() => setGenerationProgress((prev) => prev + 1), 1000);
    return () => window.clearTimeout(timeout);
    // A execução pertence à entrada na Etapa 03; o briefing fica estável durante a geração.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, generationProgress]);

  useEffect(() => {
    if (!investigationState.isZoomed) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setInvestigationState((prev) => ({ ...prev, isZoomed: false }));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [investigationState.isZoomed]);

  function inspectHotspot(id: HotspotId) {
    setFocusedHotspotId(id);
    setInvestigationState((prev) => ({
      ...prev,
      inspectedHotspots: prev.inspectedHotspots.includes(id) ? prev.inspectedHotspots : [...prev.inspectedHotspots, id],
    }));
  }

  function openDocument(id: DocumentId) {
    setOpenedDocument((prev) => (prev === id ? null : id));
    setInvestigationState((prev) => ({
      ...prev,
      readDocuments: prev.readDocuments.includes(id) ? prev.readDocuments : [...prev.readDocuments, id],
    }));
  }

  function startAccusation() {
    setAccusation((prev) => ({ ...prev, suspectId: prev.suspectId || investigationState.primeSuspectId || "" }));
    goToStep(5);
  }

  function confirmAccusation() {
    if (!canAccuse || !dossiePublico || !solucaoOculta) return;
    setVerdict(validateAccusation(accusation, solucaoOculta, dossiePublico));
    goToStep(6);
  }

  function testAsGuest() {
    if (!dossiePublico) {
      setFeedback("Gere um caso na Etapa 03 antes de ativar o modo convidado.");
      return;
    }
    setGuestMode(true);
    setInvestigationState(emptyInvestigation());
    setAccusation(emptyAccusation());
    setVerdict(null);
    setOpenedDocument(null);
    setFocusedHotspotId(null);
    goToStep(4);
  }

  function exitGuest() {
    setGuestMode(false);
    setVerdict(null);
    setAccusation(emptyAccusation());
    setInvestigationState(emptyInvestigation());
    setCurrentStep(dossiePublico ? 4 : 1);
    setFeedback("Modo de criação reativado. O caso gerado foi preservado.");
  }

  function clearHash() {
    if (typeof window === "undefined") return;
    try {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    } catch {
      // Navegadores podem bloquear alteração da URL em ambientes de visualização.
    }
  }

  function resetPrototype() {
    setBriefing(cloneBriefing(defaultBriefing));
    setSelectedPremiseId("prem1");
    setDossiePublico(null);
    setSolucaoOculta(null);
    setInvestigationState(emptyInvestigation());
    setAccusation(emptyAccusation());
    setVerdict(null);
    setOpenedDocument(null);
    setFocusedHotspotId(null);
    setGenerationProgress(0);
    setGuestMode(false);
    setFurthestStep(1);
    setCurrentStep(1);
    setFeedback("");
    clearHash();
  }

  function newCase() {
    setGuestMode(false);
    setDossiePublico(null);
    setSolucaoOculta(null);
    setAccusation(emptyAccusation());
    setInvestigationState(emptyInvestigation());
    setVerdict(null);
    setOpenedDocument(null);
    setFocusedHotspotId(null);
    setGenerationProgress(0);
    setFurthestStep(1);
    setCurrentStep(1);
    setFeedback("");
    clearHash();
  }

  async function copyCaseLink() {
    if (!dossiePublico || typeof window === "undefined") return;
    const payload: SharedPayload = { briefing: dossiePublico.briefing, selectedPremiseId: dossiePublico.premiseId };
    const link = `${window.location.href.split("#")[0]}#MIST-2110-${encodeShare(payload)}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        const el = document.createElement("textarea");
        el.value = link;
        el.style.position = "fixed";
        el.style.left = "-9999px";
        document.body.appendChild(el);
        el.select();
        const copied = document.execCommand("copy");
        document.body.removeChild(el);
        if (!copied) throw new Error("clipboard indisponível");
      }
      setFeedback("Link copiado para a área de transferência!");
    } catch {
      setFeedback(`Não foi possível copiar automaticamente. Copie este endereço: ${link}`);
    }
  }

  const stepAccessible = (step: Step) => {
    if (guestMode && step < 4) return false;
    if (step > furthestStep) return false;
    if (step >= 4 && !dossiePublico) return false;
    if (step === 6 && !verdict) return false;
    return true;
  };

  return (
    <div className="app-shell">
      <div className="ambient-glow" aria-hidden="true"/>
      <header className="site-header">
        <div className="header-inner">
          <button type="button" className="brand" onClick={resetPrototype} aria-label="Início: Fábrica de Mistérios">
            <span className="brand-symbol"><Fingerprint size={25}/></span>
            <span className="brand-type"><strong>Fábrica <i>de</i> Mistérios</strong><small>ATELIÊ DE INVESTIGAÇÕES · EST. 2026</small></span>
          </button>
          <div className="header-right">
            <span className="edition-tag"><span className="tiny-gold-dot"/> PROTÓTIPO INTERATIVO · V2</span>
            {guestMode && <span className="guest-badge"><Eye size={14}/> CONVIDADO</span>}
            <button type="button" className="header-control" onClick={guestMode ? exitGuest : testAsGuest} aria-pressed={guestMode} title={guestMode ? "Sair da visão de convidado" : "Abrir como outro jogador"}>
              {guestMode ? <EyeOff size={17}/> : <Eye size={17}/>}
              <span>{guestMode ? "Voltar ao criador" : "Visão de convidado"}</span>
            </button>
            <button type="button" className="header-reset" onClick={resetPrototype} title="Reiniciar toda a experiência" aria-label="Reiniciar protótipo"><RotateCcw size={17}/></button>
          </div>
        </div>
      </header>
      <div className="navigation-wrap">
        <nav className="stepper" aria-label="Etapas do mistério">
          {STEPS.filter((s) => !guestMode || s.numero >= 4).map((step) => {
            const accessible = stepAccessible(step.numero);
            const active = currentStep === step.numero;
            return <button type="button" key={step.numero} onClick={() => accessible && goToStep(step.numero)} disabled={!accessible}
              aria-current={active ? "step" : undefined} className={`step-button ${active ? "step-active" : ""} ${accessible && !active ? "step-passed" : ""}`}>
              <span className="step-index">{String(step.numero).padStart(2,"0")}</span><span className="step-name">{step.nome}</span>
              {step.numero < currentStep && <Check size={13} className="step-check"/>}
            </button>;
          })}
        </nav>
      </div>

      <main className="main-content">
        {feedback && <div role="status" className="notice"><span><ShieldCheck size={18}/>{feedback}</span><button type="button" onClick={() => setFeedback("")} aria-label="Dispensar aviso"><X size={18}/></button></div>}

        {currentStep === 1 && !guestMode && (
          <section className="stage stage-enter">
            <div className="stage-hero">
              <div className="hero-copy">
                <Eyebrow light>O NASCIMENTO DE UM ENIGMA</Eyebrow>
                <h1>Todo mistério<br/>começa com <em>uma escolha.</em></h1>
                <p>Você imagina o universo. Nós conectamos as pistas. Depois, é a sua vez de descobrir o que realmente aconteceu.</p>
                <div className="hero-quote"><span>“</span> A verdade está nos detalhes que ninguém percebe. <span>”</span></div>
                <div className="hero-facts"><div><strong>03</strong><small>SUSPEITOS</small></div><div><strong>05</strong><small>EVIDÊNCIAS</small></div><div><strong>01</strong><small>VERDADE</small></div></div>
                <p className="prototype-note"><span>●</span> Versão demonstrativa: a trama e o culpado seguem um roteiro fixo, adaptado aos nomes escolhidos.</p>
              </div>
              <div className="hero-poster"><PosterArt/><span className="poster-vertical">PROJETO FERRAMENTA / CIN — 2026</span></div>
            </div>
            <div className="section-heading"><div><Eyebrow>01 / O BRIEFING</Eyebrow><h2>Prepare o cenário.</h2><p>Comece pelas peças da história. Você pode voltar e editar tudo antes de gerar o caso.</p></div><Stamp>CONFIDENCIAL</Stamp></div>
            <div className="config-grid">
              <div className={`${panel} scenario-panel`}>
                <div className="panel-header"><span className="chapter-number">A</span><div><h3>Onde tudo acontece?</h3><p>O local onde um segredo foi escondido.</p></div><MapPin size={19}/></div>
                <label htmlFor="cenario" className="field-label">DESCRIÇÃO DO CENÁRIO</label>
                <input id="cenario" className={inputClass} maxLength={180} value={briefing.cenario} onChange={(e) => updateBriefing({...cloneBriefing(briefing), cenario:e.target.value})}/>
                <div className="quick-label">INSPIRAÇÕES RÁPIDAS</div>
                <div className="quick-pills">
                  {[["Mansão vitoriana","Mansão Vitoriana durante um jantar de negócios"],["Laboratório","Laboratório Farmacêutico após o expediente"],["Galeria de arte","Galeria de Arte durante uma exposição exclusiva"]].map(([name,value])=><button type="button" key={name} onClick={()=>updateBriefing({...cloneBriefing(briefing),cenario:value})}>{name}<ArrowRight size={13}/></button>)}
                </div>
              </div>
              <div className={`${panel} types-panel`}>
                <div className="panel-header"><span className="chapter-number">B</span><div><h3>O que ficará para trás?</h3><p>Selecione ao menos dois tipos de pistas.</p></div><Search size={19}/></div>
                <div className="evidence-choices">
                  {EVIDENCE_TYPES.map((tipo)=><label key={tipo} className={`evidence-option ${briefing.tiposPista.includes(tipo)?"evidence-selected":""}`}>
                    <input type="checkbox" checked={briefing.tiposPista.includes(tipo)} onChange={(e)=>toggleEvidenceType(tipo,e.target.checked)}/><span className="fake-check">{briefing.tiposPista.includes(tipo)&&<Check size={13}/>}</span><span>{tipo}</span>
                  </label>)}
                </div>
                <div className="panel-footnote">{briefing.tiposPista.length} DE 5 CATEGORIAS ATIVAS <span>As cinco pistas do MVP permanecem fixas.</span></div>
              </div>
            </div>
            <div className="suspects-heading"><div><Eyebrow>O ELENCO</Eyebrow><h2>Três pessoas. Três versões.</h2></div><span>Complete os nomes e vínculos com a história.</span></div>
            <div className="suspect-editor-grid">
              {briefing.suspeitos.map((s,index)=><div key={s.id} className="suspect-editor">
                <div className="portrait"><span className="portrait-silhouette"/><span className="portrait-corner">{`0${index+1}`}</span></div>
                <div className="suspect-editor-fields"><span className="card-overline">FICHA DE PERSONAGEM · {s.id.toUpperCase()}</span>
                  <label htmlFor={`nome-${s.id}`} className="field-label">NOME DO SUSPEITO</label><input id={`nome-${s.id}`} className={inputClass} value={s.nome} maxLength={80} aria-invalid={!s.nome.trim()} onChange={(e)=>updateSuspect(s.id,"nome",e.target.value)}/>
                  <label htmlFor={`relacao-${s.id}`} className="field-label">RELAÇÃO COM O CASO</label><input id={`relacao-${s.id}`} className={inputClass} value={s.relacao} maxLength={120} onChange={(e)=>updateSuspect(s.id,"relacao",e.target.value)}/>
                </div>
              </div>)}
            </div>
            <div className="stage-actions end"><span className="action-hint"><LockKeyhole size={16}/> Você criará o caso sem descobrir a resposta.</span>
              <button type="button" className={primaryButton} disabled={!briefing.cenario.trim() || briefing.suspeitos.some((s)=>!s.nome.trim()) || briefing.tiposPista.length<2} onClick={()=>goToStep(2)}>Explorar premissas <ArrowRight size={17}/></button>
            </div>
          </section>
        )}

        {currentStep === 2 && !guestMode && (
          <section className="stage stage-enter">
            <div className="center-intro"><Eyebrow light>02 / O PONTO DE PARTIDA</Eyebrow><h1>Qual será <em>o mistério?</em></h1><p>Três possibilidades nascidas do seu cenário. Escolha a história que quer investigar — sem spoilers.</p><span className="location-line"><MapPin size={14}/>{briefing.cenario}</span></div>
            <div className="premise-grid">
              {premises.map((premise,index)=>{
                const active = selectedPremiseId === premise.id;
                return <button type="button" key={premise.id} className={`premise-card ${active?"premise-selected":""}`} aria-pressed={active}
                  onClick={()=>{setSelectedPremiseId(premise.id);setDossiePublico(null);setSolucaoOculta(null);setVerdict(null);setGenerationProgress(0);setFurthestStep(2);}}>
                  <div className="premise-top"><span>HIPÓTESE · 0{index+1}</span><span className="premise-radio">{active&&<Check size={15}/>}</span></div>
                  <div className={`premise-art premise-art-${index+1}`}><span className="premise-art-symbol">{index===0?<Clock3 size={58} strokeWidth={.85}/>:index===1?<KeyRound size={58} strokeWidth={.85}/>:<EyeOff size={58} strokeWidth={.85}/>}</span></div>
                  <h2>{PREMISE_DETAILS[premise.id].prefixo}</h2><p>{premise.sinopse}</p><div className="premise-bottom"><span>{active?"PREMISSA SELECIONADA":"SELECIONAR ESTA TRAMA"}</span><ArrowRight size={16}/></div>
                </button>;
              })}
            </div>
            <div className="stage-actions"><button type="button" className={secondaryButton} onClick={()=>goToStep(1)}><ArrowLeft size={17}/> Rever briefing</button><button type="button" className={primaryButton} onClick={()=>{setGenerationProgress(0);goToStep(3);}}>Montar o dossiê <ArrowRight size={17}/></button></div>
          </section>
        )}

        {currentStep === 3 && !guestMode && (
          <section className="stage stage-enter generation-stage">
            <div className="generation-symbol"><Fingerprint size={57} strokeWidth={1.15}/><span className="generation-ring"/></div>
            <Eyebrow light>03 / LABORATÓRIO NARRATIVO</Eyebrow>
            <h1>A história está<br/><em>tomando forma.</em></h1>
            <p className="generation-lead">Ligando horários, álibis e pequenas contradições para criar um caso que possa ser investigado.</p>
            <div className="generation-list">
              {[
                {title:"Estrutura narrativa",desc:`Adaptando o roteiro aos personagens ${briefing.suspeitos.map(s=>s.nome).join(", ")}.`},
                {title:"Documentos e álibis",desc:"Organizando quatro arquivos e uma solução que permanece oculta."},
                {title:"Cena de evidências",desc:"Preparando os três detalhes visuais interativos das 21:10."}
              ].map((task,i)=><div key={task.title} className={`generation-task ${generationProgress>i?"task-done":generationProgress===i?"task-current":""}`}><span>{generationProgress>i?<Check size={19}/>:String(i+1).padStart(2,"0")}</span><div><strong>{task.title}</strong><small>{task.desc}</small></div><span className="task-status">{generationProgress>i?"CONCLUÍDO":generationProgress===i?"EM CURSO":"AGUARDANDO"}</span></div>)}
              <div className="generation-track"><div style={{width:`${generationProgress/3*100}%`}}/></div>
            </div>
            <p className="simulation-disclaimer"><ShieldCheck size={16}/> Esta versão simula IA: os eventos e pistas são predefinidos. Nenhuma API externa é acionada.</p>
            <div className="stage-actions"><button type="button" className={secondaryButton} onClick={()=>goToStep(2)}><ArrowLeft size={16}/> Voltar</button><button type="button" className={primaryButton} onClick={finishGeneration}>Abrir caso agora <ArrowRight size={17}/></button></div>
          </section>
        )}

        {currentStep === 4 && dossiePublico && (
          <section className="stage stage-enter">
            <div className="case-intro"><div><Eyebrow light>ARQUIVO {dossiePublico.identificador} · INVESTIGAÇÃO ATIVA</Eyebrow><h1>{PREMISE_DETAILS[dossiePublico.premiseId].prefixo}</h1><p>{dossiePublico.sinopse} <span className="case-location">{dossiePublico.briefing.cenario}</span></p></div>
              <div className="progress-card"><div><span>PROGRESSO DO DOSSIÊ</span><strong>{evidenceCount}<small>/ 05</small></strong></div><div className="progress-pips">{Array.from({length:5},(_,i)=><span key={i} className={i<evidenceCount?"filled":""}/>)}</div><small>{evidenceCount===5?"Você examinou todas as pistas.":"Examine a cena e abra os documentos."}</small></div>
            </div>
            <div className="investigation-grid">
              <div className="investigation-left">
                <div className="scene-card"><div className="scene-head"><div><span className="panel-overline">FOTOGRAFIA DE EVIDÊNCIA · V1</span><h2>A cena do acontecimento</h2></div><button type="button" className="icon-action" onClick={()=>setInvestigationState(p=>({...p,isZoomed:true}))} title="Ampliar fotografia"><Maximize2 size={16}/> Ampliar</button></div>
                  <div className="scene-mat"><Scene inspected={investigationState.inspectedHotspots} onInspect={inspectHotspot}/></div>
                  <div className="scene-caption"><span>FOTO 001 / ARQUIVO FORENSE</span><span>TOQUE NOS CÍRCULOS PARA EXAMINAR · {investigationState.inspectedHotspots.length}/3</span></div>
                </div>
                <div className="finding-panel"><div className="finding-icon"><Search size={23}/></div><div><span className="panel-overline">RELATÓRIO DE OBSERVAÇÃO</span><h3>{activeHotspot?activeHotspot.nome:"Algo nesta cena não combina..."}</h3><p>{activeHotspot?activeHotspot.observacao:"Explore os três marcadores dourados sobre a fotografia para recolher evidências. Cada detalhe poderá mudar sua interpretação dos álibis."}</p></div>{activeHotspot&&<Stamp>INSPECIONADO</Stamp>}</div>
                <div className="evidence-timeline"><span>20:30</span><div className="timeline-rule"><i/><i/><i/></div><span>21:10</span><div className="timeline-rule"><i/><i/></div><span>21:30</span></div>
              </div>
              <div className="dossier-card"><div className="dossier-header"><span>DEPARTAMENTO DE INVESTIGAÇÕES</span><h2>Dossiê do caso</h2><p>Álibis, documentos e anotações</p><div className="dossier-seal">FM<br/><small>2026</small></div></div>
                <div className="dossier-tabs" role="tablist" aria-label="Seções do dossiê">
                  {([['suspeitos','Suspeitos'],['documentos','Provas'],['hipoteses','Notas']] as Array<[TabId,string]>).map(([id,name])=><button key={id} type="button" role="tab" aria-selected={investigationState.activeTab===id} className={investigationState.activeTab===id?"dossier-tab-active":""} onClick={()=>setInvestigationState(p=>({...p,activeTab:id}))}>{name}</button>)}
                </div>
                <div className="dossier-body">
                  {investigationState.activeTab==="suspeitos"&&<><p className="dossier-intro">Três depoimentos foram colhidos. Marque quem desperta mais suspeitas.</p>
                    {dossiePublico.suspeitos.map((s,i)=><div key={s.id} className={`dossier-suspect ${investigationState.primeSuspectId===s.id?"dossier-suspect-marked":""}`}><div className="suspect-avatar"><Users size={23}/></div><div><div className="suspect-row"><span>SUSPEITO 0{i+1}</span>{investigationState.primeSuspectId===s.id&&<Flag size={15}/>}</div><h3>{s.nome}</h3><small>{s.relacao}</small><p>{s.alibi}</p><button type="button" onClick={()=>setInvestigationState(p=>({...p,primeSuspectId:s.id}))}><Flag size={13}/>{investigationState.primeSuspectId===s.id?"Principal suspeito":"Marcar como suspeito"}</button></div></div>)}
                  </>}
                  {investigationState.activeTab==="documentos"&&<><p className="dossier-intro">Clique para abrir cada documento. Os arquivos lidos entram no seu progresso.</p>
                    {dossiePublico.documentos.map((doc)=>{
                      const read=investigationState.readDocuments.includes(doc.id);const open=openedDocument===doc.id;
                      return <div key={doc.id} className={`document-wrap ${open?"document-open":""}`}><button type="button" className="document-trigger" onClick={()=>openDocument(doc.id)} aria-expanded={open}><span className="document-icon"><FileSearch size={21}/></span><span className="document-info"><small>ARQUIVO {doc.id.toUpperCase()} · {read?"EXAMINADO":"NÃO LIDO"}</small><strong>{doc.titulo}</strong><em>{doc.resumo}</em></span><ChevronDown size={18} className={open?"chevron-up":""}/></button>
                      {open&&<div className="document-content"><div className="document-letterhead">{doc.tipo} · {dossiePublico.identificador}</div>{doc.linhas.map((line,i)=><p key={i}>{line}</p>)}<div className="document-auth">REGISTRO AUTENTICADO / ARQUIVO DE EVIDÊNCIAS</div></div>}
                      </div>;
                    })}</>}
                  {investigationState.activeTab==="hipoteses"&&<><p className="dossier-intro">Cruze os horários e os depoimentos. Suas notas ficam neste dispositivo enquanto a página estiver aberta.</p><label htmlFor="notes" className="field-label">CADERNO DE DEDUÇÕES</label><textarea id="notes" className="notebook-textarea" rows={8} value={investigationState.playerNotes} onChange={(e)=>setInvestigationState(p=>({...p,playerNotes:e.target.value}))} placeholder="O que não combina nessa história? Escreva suas hipóteses..."/>
                    <div className="checklist-heading">CHECKLIST DE INVESTIGAÇÃO</div>{[...HOTSPOTS.map(h=>({id:h.id,title:h.nome,done:investigationState.inspectedHotspots.includes(h.id)})),...dossiePublico.documentos.map(d=>({id:d.id,title:d.titulo,done:investigationState.readDocuments.includes(d.id)}))].map(item=><div key={item.id} className="checklist-item">{item.done?<CheckCircle2 size={17}/>:<span/>}{item.title}</div>)}
                  </>}
                </div>
                <div className="dossier-bottom"><LockKeyhole size={14}/> CONTEÚDO RESTRITO · SOLUÇÃO LACRADA</div>
              </div>
            </div>
            <div className="accusation-dock"><div><span>PRONTO PARA FAZER SUA ACUSAÇÃO?</span><p>A verdade só será revelada quando você concluir seu palpite.</p></div><button type="button" className={primaryButton} onClick={startAccusation}>Formalizar acusação <ArrowRight size={17}/></button></div>
          </section>
        )}

        {currentStep === 5 && dossiePublico && (
          <section className="stage stage-enter accusation-stage"><div className="center-intro"><Eyebrow light>05 / A HORA DA VERDADE</Eyebrow><h1>Faça <em>sua acusação.</em></h1><p>Uma pessoa, duas evidências. Depois de confirmar, o arquivo confidencial será aberto.</p></div>
            <div className="accusation-paper"><div className="accusation-paper-header"><div><span>FORMULÁRIO OFICIAL</span><h2>Relatório de conclusão</h2><small>PROCESSO {dossiePublico.identificador} · PREENCHIMENTO PELO INVESTIGADOR</small></div><Stamp>EM ANÁLISE</Stamp></div>
              <h3 className="form-section-heading"><span>01</span> Quem você acusa?</h3>
              <div className="accused-grid">{dossiePublico.suspeitos.map((s,i)=><button type="button" key={s.id} className={`accused-choice ${accusation.suspectId===s.id?"accused-active":""}`} aria-pressed={accusation.suspectId===s.id} onClick={()=>{setAccusation(p=>({...p,suspectId:s.id}));setVerdict(null);}}><span className="accused-number">FICHA 0{i+1}</span><span className="accused-avatar"><Users size={30}/></span><strong>{s.nome}</strong><small>{s.relacao}</small><span className="accused-check">{accusation.suspectId===s.id?<Check size={15}/>:null}</span></button>)}</div>
              <h3 className="form-section-heading"><span>02</span> Quais pistas sustentam sua versão?</h3>
              <div className="form-double">{([['mainEvidenceId','EVIDÊNCIA PRINCIPAL'],['secondaryEvidenceId','EVIDÊNCIA COMPLEMENTAR']] as const).map(([field,label])=><div key={field}><label htmlFor={field} className="field-label">{label} *</label><select className={inputClass} id={field} value={accusation[field]} onChange={(e)=>{const id=e.target.value as EvidenceId|"";setAccusation(p=>({...p,[field]:id,...(field==='mainEvidenceId'&&id===p.secondaryEvidenceId?{secondaryEvidenceId:""}:{})}));setVerdict(null);}}><option value="">Selecione um elemento de prova...</option>{(Object.keys(EVIDENCE_LABELS) as EvidenceId[]).map(id=><option key={id} value={id} disabled={id===(field==='mainEvidenceId'?accusation.secondaryEvidenceId:accusation.mainEvidenceId)}>{id.toUpperCase()} — {EVIDENCE_LABELS[id]}</option>)}</select></div>)}</div>
              <div className="motive-wrapper"><label htmlFor="motiveSummary" className="field-label">SUAS CONCLUSÕES (OPCIONAL)</label><textarea id="motiveSummary" rows={4} className="notebook-textarea" placeholder="Descreva a contradição que encontrou..." value={accusation.motiveSummary} onChange={(e)=>setAccusation(p=>({...p,motiveSummary:e.target.value}))}/></div>
              <p className="form-disclaimer"><LockKeyhole size={15}/> Depois de confirmar, a solução será mostrada. Seu palpite não poderá ser alterado neste veredito.</p>
            </div>
            <div className="stage-actions"><button type="button" className={secondaryButton} onClick={()=>goToStep(4)}><ArrowLeft size={17}/> Voltar à investigação</button><button type="button" className={primaryButton} disabled={!canAccuse} onClick={confirmAccusation}>Revelar a verdade <KeyRound size={17}/></button></div>
          </section>
        )}

        {currentStep === 6 && dossiePublico && verdict && (
          <section className="stage stage-enter verdict-stage"><div className="center-intro"><Eyebrow light>06 / ARQUIVO DESLACRADO</Eyebrow><h1>O mistério <em>foi revelado.</em></h1><p>{dossiePublico.titulo}</p></div>
            <div className={`verdict-banner verdict-${verdict.kind}`}><span className="verdict-emblem">{verdict.kind==='perfect'?<ShieldCheck size={36}/>:verdict.kind==='partial'?<FileSearch size={36}/>:<X size={36}/>}</span><div><span>RESULTADO DA INVESTIGAÇÃO</span><h2>{verdict.kind==='perfect'?"Dedução impecável":verdict.kind==='partial'?"Você encontrou o culpado":"A verdade escapou"}</h2><p>{verdict.kind==='perfect'?"Você identificou o culpado e cruzou as evidências decisivas.":verdict.kind==='partial'?"O culpado está correto, mas faltou ligar as evidências determinantes.":"A pessoa acusada não corresponde à solução do caso. Confira os fatos revelados abaixo."}</p></div><Stamp>CASO ENCERRADO</Stamp></div>
            <div className="verdict-columns"><div className="reveal-paper"><span className="panel-overline">SUA ACUSAÇÃO</span><h3>{dossiePublico.suspeitos.find(s=>s.id===verdict.acusacao.suspectId)?.nome||"Sem suspeito"}</h3><p><strong>PROVA A:</strong> {EVIDENCE_LABELS[verdict.acusacao.mainEvidenceId as EvidenceId]}</p><p><strong>PROVA B:</strong> {EVIDENCE_LABELS[verdict.acusacao.secondaryEvidenceId as EvidenceId]}</p><div className="reveal-note">{verdict.acusacao.motiveSummary.trim()||"Nenhuma justificativa escrita."}</div></div>
              <div className="reveal-paper reveal-solution"><span className="panel-overline">SOLUÇÃO DO ROTEIRO (SIMULADA)</span><h3>{verdict.culpadoNome}</h3><p>{verdict.explicacao}</p><div className="reveal-note"><strong>PROVAS RELEVANTES:</strong> {verdict.provasEsperadas}</div></div></div>
            <div className="timeline-panel"><div className="timeline-title"><Clock3 size={22}/><div><Eyebrow>LIGAÇÕES REVELADAS</Eyebrow><h2>A cronologia verdadeira</h2></div></div><div className="chronology">{verdict.cronologia.map((ev,i)=><div key={i} className="chronology-event"><span>{ev.hora}</span><i/><p>{ev.fato}</p></div>)}</div></div>
            <div className="share-panel"><div><Eyebrow light>O PRÓXIMO CAPÍTULO</Eyebrow><h2>Outro olhar pode descobrir mais.</h2><p>Compartilhe este mesmo caso sem a solução ou abra uma investigação limpa como convidado.</p></div><div className="share-actions"><button type="button" className={primaryButton} onClick={copyCaseLink}><Copy size={16}/> Copiar link do caso</button><button type="button" className={secondaryButton} onClick={testAsGuest}><Eye size={16}/> Jogar como convidado</button><button type="button" className="button button-ghost" onClick={newCase}><RotateCcw size={16}/> Criar outro caso</button></div></div>
            <p className="small-legal">O link contém apenas dados públicos do briefing e da premissa. Para compartilhar entre computadores, publique a aplicação na internet. A solução é fixa nesta demonstração.</p>
          </section>
        )}
      </main>
      {investigationState.isZoomed&&dossiePublico&&<div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Cena ampliada" onMouseDown={e=>{if(e.target===e.currentTarget)setInvestigationState(p=>({...p,isZoomed:false}));}}><div className="modal-window"><div className="modal-header"><div><span>FOTOGRAFIA DE EVIDÊNCIA 001</span><h2>Cena do acontecimento</h2></div><button type="button" className="icon-action" onClick={()=>setInvestigationState(p=>({...p,isZoomed:false}))}><X size={17}/> Fechar</button></div><Scene compact inspected={investigationState.inspectedHotspots} onInspect={inspectHotspot}/><div className="modal-observation">{activeHotspot?<><strong>{activeHotspot.nome}</strong> — {activeHotspot.observacao}</>:"Clique nos marcadores para examinar cada detalhe."}</div><small>Pressione ESC para sair.</small></div></div>}
      <footer className="site-footer"><span>FÁBRICA DE MISTÉRIOS <i>✦</i> UMA EXPERIÊNCIA DE AUTORIA E DESCOBERTA</span><span>PROJETO ACADÊMICO · 2026 · IA SIMULADA</span></footer>
    </div>
  );
}
