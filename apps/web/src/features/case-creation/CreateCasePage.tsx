import { useEffect, useRef, useState } from "react";
import type {
  CaseBriefing,
  CaseGenerationStatus,
  CaseStatusResponse,
  CrimeType,
  Difficulty,
  MysteryTone,
  PeriodPreset,
} from "@fabrica/contracts";
import { createCase, PublicApiError, waitForCase } from "../../api/cases";
import { GenerationProgress } from "./GenerationProgress";

type CreateCasePageProps = {
  apiAvailable: boolean;
  onCaseReady: (caseId: string) => void;
};

type FormState = {
  period: PeriodPreset;
  customPeriod: string;
  crimeType: CrimeType;
  setting: string;
  difficulty: Difficulty;
  tone: MysteryTone;
};

const initialForm: FormState = {
  period: "victorian",
  customPeriod: "",
  crimeType: "murder",
  setting: "",
  difficulty: "medium",
  tone: "classic",
};

export function CreateCasePage({
  apiAvailable,
  onCaseReady,
}: CreateCasePageProps) {
  const [form, setForm] = useState<FormState>(initialForm);
  const [status, setStatus] = useState<CaseStatusResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const isGenerating = status !== null && !isTerminal(status.status);

  useEffect(() => () => controllerRef.current?.abort(), []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    const controller = new AbortController();
    controllerRef.current?.abort();
    controllerRef.current = controller;

    try {
      const created = await createCase(
        { briefing: toBriefing(form) },
        controller.signal,
      );
      setStatus(created);
      await waitForCase(created.caseId, setStatus, {
        signal: controller.signal,
      });
      onCaseReady(created.caseId);
    } catch (error) {
      if (controller.signal.aborted) return;
      setStatus(null);
      setErrorMessage(
        error instanceof PublicApiError
          ? error.message
          : "Não foi possível falar com a API. Verifique se o servidor está ligado.",
      );
    }
  }

  if (isGenerating && status) {
    return <GenerationProgress status={status} />;
  }

  return (
    <main className="creation-layout">
      <section className="hero-panel" aria-labelledby="page-title">
        <div>
          <span className="kicker">NOVO ARQUIVO · Nº 001</span>
          <h1 id="page-title">Que mistério espera por você?</h1>
          <p>
            Escolha os elementos do caso. A fábrica cuidará dos suspeitos,
            documentos, pistas e da cena do crime.
          </p>
        </div>

        <aside className="case-note">
          <span className="case-note-pin" aria-hidden="true" />
          <strong>Antes de começar</strong>
          <p>
            Quando a investigação estiver pronta, você terá apenas uma chance
            para apontar o culpado.
          </p>
        </aside>
      </section>

      <form className="case-form" onSubmit={handleSubmit}>
        <ChoiceGroup
          legend="Em que época aconteceu?"
          hint="O período define objetos, linguagem e possibilidades da investigação."
          name="period"
          value={form.period}
          options={PERIOD_OPTIONS}
          onChange={(period) => setForm((current) => ({ ...current, period }))}
        />

        {form.period === "custom" && (
          <label className="text-field custom-period-field">
            <span>Descreva o período</span>
            <input
              required
              minLength={2}
              maxLength={100}
              value={form.customPeriod}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  customPeriod: event.target.value,
                }))
              }
              placeholder="Ex.: Brasil imperial, 1875"
            />
          </label>
        )}

        <ChoiceGroup
          legend="Qual é o tipo de crime?"
          hint="Todos os casos são inteiramente fictícios."
          name="crimeType"
          value={form.crimeType}
          options={CRIME_OPTIONS}
          onChange={(crimeType) =>
            setForm((current) => ({ ...current, crimeType }))
          }
        />

        <section className="form-section">
          <div className="section-heading">
            <span className="section-number">03</span>
            <div>
              <h2>Onde tudo aconteceu?</h2>
              <p>Dê à fábrica um cenário marcante para construir o caso.</p>
            </div>
          </div>
          <label className="text-field">
            <span>Cenário da investigação</span>
            <textarea
              required
              maxLength={160}
              rows={3}
              value={form.setting}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  setting: event.target.value,
                }))
              }
              placeholder="Ex.: Um hotel isolado nas montanhas durante uma tempestade"
            />
            <small>{form.setting.length}/160</small>
          </label>
        </section>

        <div className="paired-sections">
          <ChoiceGroup
            compact
            number="04"
            legend="Dificuldade"
            hint="Quanto mais difícil, mais sutis serão as contradições."
            name="difficulty"
            value={form.difficulty}
            options={DIFFICULTY_OPTIONS}
            onChange={(difficulty) =>
              setForm((current) => ({ ...current, difficulty }))
            }
          />
          <ChoiceGroup
            compact
            number="05"
            legend="Tom da história"
            hint="Escolha a atmosfera que vai acompanhar a investigação."
            name="tone"
            value={form.tone}
            options={TONE_OPTIONS}
            onChange={(tone) => setForm((current) => ({ ...current, tone }))}
          />
        </div>

        {errorMessage && (
          <div className="form-error" role="alert">
            <strong>O arquivo não pôde ser aberto.</strong>
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="form-submit">
          <p>
            A geração pode levar alguns instantes. Você acompanhará cada etapa
            por aqui.
          </p>
          <button className="primary-button" type="submit" disabled={!apiAvailable}>
            <span aria-hidden="true">✦</span>
            {apiAvailable ? "Fabricar meu mistério" : "Aguardando a API"}
          </button>
        </div>
      </form>
    </main>
  );
}

type ChoiceOption<T extends string> = {
  value: T;
  label: string;
  detail?: string;
  icon: string;
};

type ChoiceGroupProps<T extends string> = {
  legend: string;
  hint: string;
  name: string;
  value: T;
  options: readonly ChoiceOption<T>[];
  onChange: (value: T) => void;
  compact?: boolean;
  number?: string;
};

function ChoiceGroup<T extends string>({
  legend,
  hint,
  name,
  value,
  options,
  onChange,
  compact = false,
  number,
}: ChoiceGroupProps<T>) {
  const sectionNumber = number ?? (name === "period" ? "01" : "02");
  return (
    <fieldset className={`form-section${compact ? " form-section-compact" : ""}`}>
      <legend className="sr-only">{legend}</legend>
      <div className="section-heading" aria-hidden="true">
        <span className="section-number">{sectionNumber}</span>
        <div>
          <h2>{legend}</h2>
          <p>{hint}</p>
        </div>
      </div>
      <div className={`choice-grid${compact ? " choice-grid-compact" : ""}`}>
        {options.map((option) => (
          <label className="choice-card" key={option.value}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span className="choice-icon" aria-hidden="true">{option.icon}</span>
            <span className="choice-copy">
              <strong>{option.label}</strong>
              {option.detail && <small>{option.detail}</small>}
            </span>
            <span className="choice-check" aria-hidden="true">✓</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function toBriefing(form: FormState): CaseBriefing {
  return {
    period: form.period,
    customPeriod: form.period === "custom" ? form.customPeriod.trim() : null,
    crimeType: form.crimeType,
    setting: form.setting.trim(),
    difficulty: form.difficulty,
    tone: form.tone,
  };
}

function isTerminal(status: CaseGenerationStatus) {
  return status === "ready" || status === "failed";
}

const PERIOD_OPTIONS: readonly ChoiceOption<PeriodPreset>[] = [
  { value: "medieval", label: "Medieval", detail: "Castelos e velas", icon: "♜" },
  { value: "victorian", label: "Vitoriana", detail: "Névoa e lampiões", icon: "♛" },
  { value: "1920s", label: "Anos 1920", detail: "Jazz e art déco", icon: "♬" },
  { value: "contemporary", label: "Contemporânea", detail: "Tecnologia atual", icon: "◈" },
  { value: "futuristic", label: "Futurista", detail: "Um amanhã incerto", icon: "⌁" },
  { value: "custom", label: "Outro período", detail: "Você decide", icon: "+" },
];

const CRIME_OPTIONS: readonly ChoiceOption<CrimeType>[] = [
  { value: "murder", label: "Assassinato", detail: "Um crime sem volta", icon: "†" },
  { value: "theft", label: "Roubo", detail: "Algo valioso sumiu", icon: "◇" },
  { value: "disappearance", label: "Desaparecimento", detail: "Alguém não voltou", icon: "?" },
  { value: "sabotage", label: "Sabotagem", detail: "Um plano foi interrompido", icon: "⚙" },
];

const DIFFICULTY_OPTIONS: readonly ChoiceOption<Difficulty>[] = [
  { value: "easy", label: "Iniciante", icon: "I" },
  { value: "medium", label: "Investigador", icon: "II" },
  { value: "hard", label: "Mestre", icon: "III" },
];

const TONE_OPTIONS: readonly ChoiceOption<MysteryTone>[] = [
  { value: "classic", label: "Clássico", icon: "♢" },
  { value: "dark", label: "Sombrio", icon: "☾" },
  { value: "suspense", label: "Suspense", icon: "◷" },
];
