import { readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyReply } from "fastify";
import {
  API_PATHS,
  apiErrorResponseSchema,
  caseIdSchema,
  createCaseRequestSchema,
  submitAccusationRequestSchema,
} from "@fabrica/contracts";
import type { ApiErrorCode, CaseStatusResponse } from "@fabrica/contracts";
import type { AppConfig } from "../config/index.js";
import type { CaseRepository } from "../database/index.js";
import type { CaseGenerationQueue } from "../generation/index.js";
import type { AccusationService } from "../accusation/index.js";
import {
  AccusationAlreadyExistsError,
  InvalidAccusationSuspectError,
} from "../database/index.js";

export type GameRoutesDependencies = {
  cases: CaseRepository;
  generationQueue: CaseGenerationQueue;
  accusations: AccusationService;
  images: Pick<AppConfig["images"], "directory" | "public_path">;
  baseDirectory?: string;
};

export function registerGameRoutes(
  app: FastifyInstance,
  dependencies: GameRoutesDependencies,
) {
  const imagesDirectory = path.resolve(
    dependencies.baseDirectory ?? process.cwd(),
    dependencies.images.directory,
  );
  const publicPath = `/${dependencies.images.public_path.replace(
    /^\/+|\/+$/g,
    "",
  )}`;

  app.post(API_PATHS.cases, async (request, reply) => {
    const parsed = createCaseRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(
        reply,
        400,
        "invalid_request",
        "Os dados para criar o caso são inválidos.",
      );
    }

    const status = dependencies.cases.createPending({
      id: randomUUID(),
      briefing: parsed.data.briefing,
    });
    dependencies.generationQueue.enqueue(status.caseId, parsed.data.briefing);

    return reply.code(202).send(status satisfies CaseStatusResponse);
  });

  app.get<{ Params: { caseId: string } }>(
    "/api/cases/:caseId/status",
    async (request, reply) => {
      const caseId = parseCaseId(request.params.caseId);
      if (!caseId) {
        return sendError(
          reply,
          400,
          "invalid_request",
          "O identificador do caso é inválido.",
        );
      }

      const status = dependencies.cases.findStatus(caseId);
      if (!status) return caseNotFound(reply);
      return reply.send(status);
    },
  );

  app.get<{ Params: { caseId: string } }>(
    "/api/cases/:caseId",
    async (request, reply) => {
      const caseId = parseCaseId(request.params.caseId);
      if (!caseId) {
        return sendError(
          reply,
          400,
          "invalid_request",
          "O identificador do caso é inválido.",
        );
      }

      const status = dependencies.cases.findStatus(caseId);
      if (!status) return caseNotFound(reply);
      if (status.status !== "ready") {
        return sendError(
          reply,
          409,
          "case_not_ready",
          status.status === "failed"
            ? status.errorMessage ?? "A geração do caso falhou."
            : "O caso ainda está sendo preparado.",
        );
      }

      const publicCase = dependencies.cases.findPublicCase(caseId);
      if (!publicCase) {
        request.log.error({ caseId }, "Caso pronto sem dossiê público");
        return sendError(
          reply,
          500,
          "internal_error",
          "Não foi possível carregar o caso.",
        );
      }

      return reply.send(publicCase);
    },
  );

  app.get<{ Params: { caseId: string } }>(
    "/api/cases/:caseId/accusation",
    async (request, reply) => {
      const caseId = parseCaseId(request.params.caseId);
      if (!caseId) {
        return sendError(
          reply,
          400,
          "invalid_request",
          "O identificador do caso é inválido.",
        );
      }
      if (!dependencies.cases.findStatus(caseId)) return caseNotFound(reply);

      const outcome = dependencies.accusations.findOutcome(caseId);
      if (!outcome) {
        return sendError(
          reply,
          404,
          "not_found",
          "Nenhuma acusação foi registrada para este caso.",
        );
      }
      return reply.send(outcome);
    },
  );

  app.post<{ Params: { caseId: string } }>(
    "/api/cases/:caseId/accusation",
    async (request, reply) => {
      const caseId = parseCaseId(request.params.caseId);
      if (!caseId) {
        return sendError(
          reply,
          400,
          "invalid_request",
          "O identificador do caso é inválido.",
        );
      }

      const parsed = submitAccusationRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return sendError(
          reply,
          400,
          "invalid_request",
          "Escolha um nome válido antes de acusar.",
        );
      }

      const status = dependencies.cases.findStatus(caseId);
      if (!status) return caseNotFound(reply);
      if (status.status !== "ready") {
        return sendError(
          reply,
          409,
          "case_not_ready",
          "O caso ainda não está pronto para uma acusação.",
        );
      }

      try {
        const outcome = dependencies.accusations.submit(caseId, parsed.data);
        return reply.code(201).send(outcome);
      } catch (error) {
        if (error instanceof AccusationAlreadyExistsError) {
          return sendError(
            reply,
            409,
            "accusation_already_submitted",
            "Este caso já recebeu sua única acusação.",
          );
        }
        if (error instanceof InvalidAccusationSuspectError) {
          return sendError(
            reply,
            400,
            "invalid_request",
            "O nome acusado não corresponde a um suspeito deste caso.",
          );
        }
        throw error;
      }
    },
  );

  app.get<{ Params: { caseId: string } }>(
    "/api/cases/:caseId/reveal",
    async (request, reply) => {
      const caseId = parseCaseId(request.params.caseId);
      if (!caseId) {
        return sendError(
          reply,
          400,
          "invalid_request",
          "O identificador do caso é inválido.",
        );
      }
      if (!dependencies.cases.findStatus(caseId)) return caseNotFound(reply);

      const reveal = dependencies.accusations.findReveal(caseId);
      if (!reveal) {
        return sendError(
          reply,
          403,
          "accusation_required",
          "A solução só pode ser revelada depois da acusação.",
        );
      }
      return reply.send(reveal);
    },
  );

  app.get<{ Params: { filename: string } }>(
    `${publicPath}/:filename`,
    async (request, reply) => {
      const match = request.params.filename.match(
        /^([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.(png|webp|jpeg|svg)$/i,
      );
      const caseId = match?.[1];
      const extension = match?.[2]?.toLowerCase();
      if (!caseId || !extension || !parseCaseId(caseId)) {
        return imageNotFound(reply);
      }

      const metadata = dependencies.cases.findImageMetadata(caseId);
      if (!metadata) return imageNotFound(reply);

      const resolvedFile = path.resolve(metadata.filePath);
      const relativePath = path.relative(imagesDirectory, resolvedFile);
      if (
        relativePath.startsWith("..") ||
        path.isAbsolute(relativePath) ||
        path.basename(resolvedFile) !== request.params.filename
      ) {
        return imageNotFound(reply);
      }

      try {
        const contents = await readFile(resolvedFile);
        return reply
          .header("Content-Type", imageMediaType(extension))
          .header("Cache-Control", "public, max-age=31536000, immutable")
          .header("X-Content-Type-Options", "nosniff")
          .header("Content-Security-Policy", "default-src 'none'; sandbox")
          .send(contents);
      } catch (error) {
        if (isNodeError(error) && error.code === "ENOENT") {
          return imageNotFound(reply);
        }
        request.log.error({ caseId }, "Falha ao ler imagem gerada");
        return sendError(
          reply,
          500,
          "internal_error",
          "Não foi possível carregar a imagem.",
        );
      }
    },
  );
}

function parseCaseId(value: string) {
  const parsed = caseIdSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function caseNotFound(reply: FastifyReply) {
  return sendError(reply, 404, "not_found", "Caso não encontrado.");
}

function imageNotFound(reply: FastifyReply) {
  return sendError(reply, 404, "not_found", "Imagem não encontrada.");
}

function sendError(
  reply: FastifyReply,
  statusCode: number,
  code: ApiErrorCode,
  message: string,
) {
  return reply
    .code(statusCode)
    .send(apiErrorResponseSchema.parse({ code, message }));
}

function imageMediaType(extension: string) {
  if (extension === "svg") return "image/svg+xml; charset=utf-8";
  if (extension === "jpeg") return "image/jpeg";
  return `image/${extension}`;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
