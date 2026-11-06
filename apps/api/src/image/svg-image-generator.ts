import type {
  CaseImageGenerator,
  GeneratedImage,
  ImageGenerationRequest,
} from "./types.js";

type SvgProvider = "mock" | "fallback";

export class SvgImageGenerator implements CaseImageGenerator {
  constructor(private readonly provider: SvgProvider = "mock") {}

  async generate(request: ImageGenerationRequest): Promise<GeneratedImage> {
    const label = this.provider === "fallback" ? "Imagem indisponível" : "Cena do caso";
    const detail = this.provider === "fallback"
      ? "A investigação pode continuar usando os documentos."
      : request.altText;
    const svg = buildSvg(label, detail);

    return {
      bytes: Buffer.from(svg, "utf8"),
      extension: "svg",
      mediaType: "image/svg+xml",
      metadata: {
        provider: this.provider,
        model: this.provider === "fallback" ? "local-fallback-svg" : "mock-svg",
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      },
    };
  }
}

function buildSvg(label: string, detail: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024" viewBox="0 0 1536 1024" role="img" aria-label="${escapeXml(detail)}">
  <defs>
    <radialGradient id="light" cx="50%" cy="42%" r="70%">
      <stop offset="0" stop-color="#554638"/>
      <stop offset="1" stop-color="#151414"/>
    </radialGradient>
  </defs>
  <rect width="1536" height="1024" fill="url(#light)"/>
  <path d="M240 780h1056M390 780V330h756v450M520 330V210h496v120" fill="none" stroke="#b99b68" stroke-width="12" opacity=".55"/>
  <circle cx="768" cy="470" r="112" fill="none" stroke="#d7bd86" stroke-width="10" opacity=".65"/>
  <path d="M768 390v86l62 44" fill="none" stroke="#d7bd86" stroke-width="10" stroke-linecap="round"/>
  <text x="768" y="880" text-anchor="middle" fill="#f2e7d2" font-family="Georgia,serif" font-size="48">${escapeXml(label)}</text>
  <text x="768" y="934" text-anchor="middle" fill="#c9bca8" font-family="Arial,sans-serif" font-size="25">${escapeXml(truncate(detail, 90))}</text>
</svg>`;
}

function escapeXml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&apos;",
      '"': "&quot;",
    };
    return entities[character] ?? character;
  });
}

function truncate(value: string, length: number) {
  return value.length <= length ? value : `${value.slice(0, length - 1)}…`;
}
