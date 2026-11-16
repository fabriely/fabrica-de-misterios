import type {
  CaseImageGenerator,
  GeneratedImage,
  ImageGenerationRequest,
} from "./types.js";

type SvgProvider = "mock" | "fallback";

export class SvgImageGenerator implements CaseImageGenerator {
  constructor(private readonly provider: SvgProvider = "mock") {}

  async generate(request: ImageGenerationRequest): Promise<GeneratedImage> {
    const svg = request.purpose === "portrait_sheet"
      ? buildPortraitSheetSvg(request.portraitCount ?? 3)
      : buildSceneSvg(
          this.provider === "fallback" ? "Imagem indisponível" : "Cena do caso",
          this.provider === "fallback"
            ? "A investigação pode continuar usando os documentos."
            : request.altText,
        );

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

function buildSceneSvg(label: string, detail: string) {
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

function buildPortraitSheetSvg(countInput: number) {
  const count = Math.max(2, Math.min(8, Math.trunc(countInput)));
  const colors = [
    { backdrop: "#3c483e", coat: "#282f2c", skin: "#b78362", hair: "#2a211e" },
    { backdrop: "#53483b", coat: "#3c3031", skin: "#dfb691", hair: "#554132" },
    { backdrop: "#3c444c", coat: "#303a43", skin: "#8f604a", hair: "#1f2427" },
    { backdrop: "#554742", coat: "#3b3942", skin: "#c99a73", hair: "#3b2b29" },
  ];
  const panels = Array.from({ length: count }, (_, index) => {
    const color = colors[index % colors.length]!;
    const x = index * 512;
    return `<g transform="translate(${x} 0)">
      <rect width="512" height="1024" fill="${color.backdrop}"/>
      <path d="M0 640h512M55 0v1024M457 0v1024" stroke="#d5c5a3" opacity=".12" stroke-width="8"/>
      <ellipse cx="256" cy="945" rx="228" ry="290" fill="${color.coat}"/>
      <path d="M190 680h132l34 180H156z" fill="${color.skin}"/>
      <ellipse cx="256" cy="476" rx="132" ry="166" fill="${color.skin}"/>
      <path d="M125 452q-8-190 131-203 145 7 132 203-27-97-104-105-100-10-159 105z" fill="${color.hair}"/>
      <path d="M213 488h25m36 0h25" stroke="${color.hair}" stroke-width="9" stroke-linecap="round" opacity=".6"/>
      <path d="M234 574q22 16 44 0" fill="none" stroke="${color.hair}" stroke-width="7" stroke-linecap="round" opacity=".45"/>
      <rect width="512" height="1024" fill="none" stroke="#d5c5a3" opacity=".24" stroke-width="7"/>
    </g>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${512 * count}" height="1024" viewBox="0 0 ${512 * count} 1024" role="img" aria-label="Retratos ilustrativos dos suspeitos">${panels}</svg>`;
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
