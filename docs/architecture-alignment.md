# Arquitetura implementada

O [modelo Structurizr](fabrica-de-misterios.dsl) descreve os elementos principais do sistema. O repositório oferece dois adaptadores de execução para o mesmo fluxo do jogo:

| Elemento | Desenvolvimento local | Publicação Vercel |
| --- | --- | --- |
| Interface | React + TypeScript | React + TypeScript |
| API | Fastify contínuo | Vercel Functions em `api/` |
| Premissas | OpenAI ou mock; SQLite | OpenAI ou mock; Neon Postgres |
| Geração do caso | Prompt versionado, saída estruturada e fila em memória com recuperação | Mesmo gerador; Vercel Queues para texto e imagem |
| Imagem | Arquivo local | Vercel Blob público |
| Solução | SQLite, fora do dossiê público | JSONB privado no Postgres, fora do dossiê público |
| Acusação | Única por par caso + jogador | Única por par caso + jogador com restrição no banco |

O navegador cria um UUID anônimo e o envia em `X-Player-Id` nas rotas de acusação. Essa identificação evita que uma pessoa libere a solução para todos que recebem o mesmo link. Ela não substitui uma conta: limpar o armazenamento do navegador cria uma nova identidade.

## Fluxo da IA

1. A pessoa escolhe período, tipo de ocorrência, cenário, dificuldade e tom.
2. O gerador cria três premissas públicas sem solução. A escolha e o briefing são guardados no servidor.
3. O prompt de autoria combina briefing, premissa escolhida e instruções versionadas do autor. A saída estruturada separa `publicCase`, `privateSolution` e `imagePrompt`.
4. O schema verifica referências, quantidades, IDs e evidências decisivas; a imagem é gerada ou substituída por um SVG de fallback.
5. A API publica só o dossiê. Após a acusação do jogador, libera a solução para aquele UUID.

Validação estrutural e instruções de prompt reduzem erros, mas não provam que todo caso da OpenAI seja solucionável. Antes da apresentação final, o grupo deve gerar amostras reais e pedir a pessoas externas que tentem resolver sem ajuda.

## Verificação

Em 08/11/2026, `npm run check` passou com lint, checagem de tipos, 59 testes automatizados e build. Os testes cobrem a criação de premissas, escolha, dossiê, imagem local, acusações independentes e revelação. A integração Vercel depende de Neon, Blob e Queues conectados; o roteiro de validação está em [deploy-vercel.md](deploy-vercel.md). Nenhum teste automatizado consumiu créditos da OpenAI.
