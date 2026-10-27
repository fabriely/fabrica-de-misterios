# Fábrica de Mistérios

Protótipo navegável de uma ferramenta para criar e investigar casos fictícios. A pessoa escolhe cenário, suspeitos e tipos de pista, seleciona uma premissa sem spoilers e percorre um dossiê até registrar sua acusação.

## Estado do projeto

O fluxo visual está implementado em React e TypeScript. A geração do caso, a solução e o veredito ainda são **dados de demonstração locais**. A versão publicada na Vercel deve ser apresentada como protótipo navegável; ela ainda não usa IA durante a experiência. Isso é intencional nesta etapa do projeto.

O código de demonstração fica separado em `src/demo/case.ts`. A arquitetura planejada para a versão funcional está em [`docs/architecture.md`](docs/architecture.md), com o modelo Structurizr em [`docs/fabrica-de-misterios.dsl`](docs/fabrica-de-misterios.dsl) e as instruções planejadas para a IA em [`docs/agent-instructions.md`](docs/agent-instructions.md).

## Executar localmente

Requisitos: Node.js 22 ou superior e pnpm.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Abra `http://localhost:5173`. Para conferir a versão de produção:

```bash
pnpm build
pnpm preview
```