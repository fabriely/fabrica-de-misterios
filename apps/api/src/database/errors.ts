export class RecordNotFoundError extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} não encontrado: ${id}`);
    this.name = "RecordNotFoundError";
  }
}

export class InvalidCaseStateError extends Error {
  constructor(caseId: string, operation: string) {
    super(`O caso ${caseId} não permite a operação: ${operation}.`);
    this.name = "InvalidCaseStateError";
  }
}

export class AccusationAlreadyExistsError extends Error {
  constructor(caseId: string) {
    super(`O caso ${caseId} já recebeu uma acusação.`);
    this.name = "AccusationAlreadyExistsError";
  }
}

export class CorruptStoredDataError extends Error {
  constructor(entity: string, id: string) {
    super(`Os dados persistidos de ${entity} estão inválidos: ${id}.`);
    this.name = "CorruptStoredDataError";
  }
}
