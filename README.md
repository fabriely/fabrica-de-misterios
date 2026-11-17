# Fábrica de Mistérios

Aplicação para criar e investigar casos fictícios gerados por IA. O jogador escolhe o briefing e uma entre três premissas sem spoilers, examina a cena, suspeitos e documentos, e tem uma chance de acusar alguém antes da revelação completa. Cada jogador investiga o mesmo caso de forma independente.

O projeto é um workspace TypeScript com aplicação React e contratos compartilhados. O desenvolvimento local usa API Node.js e SQLite; a publicação na Vercel usa Functions, Neon Postgres, Blob e Queues. O provedor mock permite testar sem créditos; a OpenAI gera texto, a imagem da cena e uma prancha com os retratos dos suspeitos quando configurada.

## Requisitos

- Node.js 22 ou superior
- npm 10 ou superior

## Desenvolvimento

Crie a configuração local antes da primeira execução:

```bash
cp config.example.toml config.toml
```

Esse arquivo é local, ignorado pelo Git e lido somente pela API. A chave só precisa ser preenchida quando `generation.provider = "openai"`.

```bash
npm install
npm run dev
```

- Aplicação web: `http://localhost:5173`
- API: `http://localhost:3000`
- Saúde da API: `http://localhost:3000/api/health`

## Verificações

```bash
npm run check
```

Esse comando executa lint, checagem de tipos, testes automatizados e build. Nenhuma verificação automatizada chama a OpenAI.

O andamento do MVP está registrado em [`docs/TASKS.md`](docs/TASKS.md).

A geração textual e a troca entre provedor mock e OpenAI estão descritas em [`docs/generation.md`](docs/generation.md).

A geração da cena e dos retratos, o juiz visual e a imagem reserva estão descritos em [`docs/images.md`](docs/images.md).

As rotas para criar e consultar casos estão documentadas em [`docs/api.md`](docs/api.md).

O formulário e o acompanhamento visual da geração estão descritos em [`docs/frontend.md`](docs/frontend.md).

Limites de custo, fila e recuperação após reinício estão descritos em [`docs/operations.md`](docs/operations.md).

O roteiro de testes está em [`docs/testing.md`](docs/testing.md), e o primeiro teste real com a OpenAI está em [`docs/openai-setup.md`](docs/openai-setup.md).

O estado final e os requisitos antes de uma implantação pública estão em [`docs/release-checklist.md`](docs/release-checklist.md).

A comparação entre o MVP atual e a arquitetura alvo do projeto está em [`docs/architecture-alignment.md`](docs/architecture-alignment.md), com o diagrama editável em [`docs/fabrica-de-misterios.dsl`](docs/fabrica-de-misterios.dsl).

O passo a passo de publicação está em [`docs/deploy-vercel.md`](docs/deploy-vercel.md).

## Segurança da configuração

- Nunca coloque a chave em `config.example.toml`, arquivos do frontend ou commits.
- A API recusa configuração ausente ou inválida antes de abrir a porta HTTP.
- Resumos de configuração substituem a chave por `[REDACTED]`.
- Não envie a chave por chat, issue ou captura de tela.

## Persistência local

O MVP usa SQLite no caminho definido por `database.path`. Na primeira execução, a API cria o diretório, aplica migrações versionadas e habilita chaves estrangeiras e WAL. Arquivos `*.sqlite` e imagens geradas permanecem fora do Git.

## Geração sem gastar créditos

`config.example.toml` usa `generation.provider = "mock"`. Nesse modo, a aplicação gera um caso determinístico localmente e aceita `openai.api_key = ""`. Para um teste real, altere o provedor para `openai` e preencha a chave apenas no `config.toml` ignorado pelo Git.

## Escopo atual

- Um caso por criação, com quantidades configuráveis de suspeitos e documentos.
- Uma imagem de cena e uma prancha de retratos dos suspeitos por caso novo.
- Uma acusação por jogador e caso, sem segunda tentativa.
- Solução privada até a acusação ser persistida.
- Sessões anônimas identificadas por um UUID salvo no navegador. O link do caso pode ser compartilhado sem compartilhar a revelação.
- A versão Vercel usa fila e armazenamento persistentes; a conexão com os serviços externos precisa ser feita no projeto da equipe.


## Versão 2 — Métricas e Jurado de IA

A nova versão mede operações de IA por mistério (tokens, duração, falhas, custo estimado e fallback), calcula a duração de ponta a ponta da geração, revisa a imagem antes de publicar o caso, avalia a qualidade narrativa e permite escrever uma acusação argumentativa julgada por uma LLM independente. O acerto do suspeito permanece calculado pelo backend. As avaliações e acusações são persistidas em SQLite local e PostgreSQL na Vercel.

Veja **[docs/observability-and-juror.md](docs/observability-and-juror.md)** para contratos, variáveis de ambiente (`JUDGE_PROVIDER`, `OPENAI_JUDGE_MODEL`, `AI_PRICING_JSON`), custos não precificados, migrações, limites, modo mock e roteiro de homologação. Não há chaves de API embutidas no repositório.


Para publicar a versão integrada, siga [`docs/deploy-vercel.md`](docs/deploy-vercel.md) e execute a migração do banco antes de atualizar a aplicação.
