# Fábrica de Mistérios

Aplicação para criar e investigar casos fictícios gerados por IA.

O projeto está sendo reconstruído como um workspace TypeScript com uma aplicação React, uma API Node.js e contratos compartilhados.

## Requisitos

- Node.js 22 ou superior
- npm 10 ou superior

## Desenvolvimento

Crie a configuração local antes da primeira execução:

```powershell
Copy-Item config.example.toml config.toml
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
npm run lint
npm run typecheck
npm test
npm run build
```

O andamento do MVP está registrado em [`docs/TASKS.md`](docs/TASKS.md).

A geração textual e a troca entre provedor mock e OpenAI estão descritas em [`docs/generation.md`](docs/generation.md).

A geração de uma única cena, o armazenamento local e o fallback visual estão descritos em [`docs/images.md`](docs/images.md).

## Segurança da configuração

- Nunca coloque a chave em `config.example.toml`, arquivos do frontend ou commits.
- A API recusa configuração ausente ou inválida antes de abrir a porta HTTP.
- Resumos de configuração substituem a chave por `[REDACTED]`.
- Não envie a chave por chat, issue ou captura de tela.

## Persistência local

O MVP usa SQLite no caminho definido por `database.path`. Na primeira execução, a API cria o diretório, aplica migrações versionadas e habilita chaves estrangeiras e WAL. Arquivos `*.sqlite` e imagens geradas permanecem fora do Git.

## Geração sem gastar créditos

`config.example.toml` usa `generation.provider = "mock"`. Nesse modo, a aplicação gera um caso determinístico localmente e aceita `openai.api_key = ""`. Para um teste real, altere o provedor para `openai` e preencha a chave apenas no `config.toml` ignorado pelo Git.
