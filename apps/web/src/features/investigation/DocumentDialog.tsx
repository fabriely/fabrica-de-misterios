import { useEffect, useRef } from "react";
import type { CaseDocument } from "@fabrica/contracts";
import { documentTypeLabel } from "./labels";

type DocumentDialogProps = {
  document: CaseDocument;
  number: number;
  onClose: () => void;
};

export function DocumentDialog({ document, number, onClose }: DocumentDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="document-dialog"
      aria-labelledby="document-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <article className="document-sheet">
        <button
          className="dialog-close"
          type="button"
          onClick={onClose}
          aria-label="Fechar documento"
        >
          ×
        </button>
        <header>
          <span>{documentTypeLabel(document.type)}</span>
          <small>ANEXO DE EVIDÊNCIA · {String(number).padStart(2, "0")}</small>
          <h2 id="document-dialog-title">{document.title}</h2>
          <p>{document.summary}</p>
        </header>
        <div className="document-body">
          <span className="document-stamp" aria-hidden="true">ANALISADO</span>
          {document.content.split("\n").map((paragraph, index) => (
            <p key={`${document.id}_${index}`}>{paragraph}</p>
          ))}
        </div>
        <footer>
          <span>Fábrica de Mistérios</span>
          <span>Documento público da investigação</span>
        </footer>
      </article>
    </dialog>
  );
}
