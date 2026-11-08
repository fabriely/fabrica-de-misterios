export class CaseGenerationProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CaseGenerationProviderError";
  }
}
