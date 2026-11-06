import { useEffect, useRef, useState } from "react";
import type { Suspect } from "@fabrica/contracts";

type AccusationDialogProps = {
  suspects: Suspect[];
  submitting: boolean;
  errorMessage: string | null;
  onSubmit: (suspectName: string) => void;
  onClose: () => void;
};

export function AccusationDialog({
  suspects,
  submitting,
  errorMessage,
  onSubmit,
  onClose,
}: AccusationDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="accusation-dialog"
      aria-labelledby="accusation-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!submitting) onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <section className="accusation-sheet">
        <button
          className="dialog-close accusation-close"
          type="button"
          onClick={onClose}
          aria-label="Cancelar acusação"
          disabled={submitting}
        >
          ×
        </button>
        <span className="accusation-symbol" aria-hidden="true">◇</span>
        <span className="kicker">DECISÃO FINAL</span>
        <h2 id="accusation-title">Quem você acusa?</h2>
        <p>
          Escolha um nome com cuidado. Depois de confirmar, este caso não
          aceitará outra acusação.
        </p>

        <fieldset className="accusation-options">
          <legend className="sr-only">Escolha o suspeito acusado</legend>
          {suspects.map((suspect, index) => (
            <label key={suspect.id}>
              <input
                type="radio"
                name="accused-suspect"
                value={suspect.name}
                checked={selectedName === suspect.name}
                onChange={() => setSelectedName(suspect.name)}
                disabled={submitting}
              />
              <span className="accusation-option-number">{String(index + 1).padStart(2, "0")}</span>
              <span><strong>{suspect.name}</strong><small>{suspect.role}</small></span>
              <i aria-hidden="true">✓</i>
            </label>
          ))}
        </fieldset>

        <div className="single-chance-warning">
          <strong>Uma única chance</strong>
          <span>Esta decisão será registrada permanentemente.</span>
        </div>

        {errorMessage && <p className="accusation-error" role="alert">{errorMessage}</p>}

        <button
          className="confirm-accusation"
          type="button"
          disabled={!selectedName || submitting}
          onClick={() => selectedName && onSubmit(selectedName)}
        >
          {submitting ? "Registrando acusação..." : `Confirmar${selectedName ? `: ${selectedName}` : " acusação"}`}
        </button>
      </section>
    </dialog>
  );
}
