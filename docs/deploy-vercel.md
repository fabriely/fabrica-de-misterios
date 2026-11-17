# Publicar a Fábrica de Mistérios na Vercel

O repositório mantém dois modos de execução. `npm run dev` usa Fastify, SQLite e arquivos locais. Na Vercel, as funções em `api/` usam Neon Postgres, Vercel Blob e Vercel Queues. Os dois modos compartilham contratos, prompts e geradores; o navegador usa as mesmas rotas `/api`.

## Preparar serviços

1. Crie um projeto Vercel a partir da raiz deste repositório. O `vercel.json` já define o build do workspace React, as funções e as três filas privadas. Use o plano Hobby para o protótipo.
2. Conecte um banco Postgres da Neon pelo [Marketplace da Vercel](https://vercel.com/docs/marketplace-storage). Configure a string de conexão como `DATABASE_URL` nas variáveis de ambiente do projeto.
3. Crie uma loja **pública** no [Vercel Blob](https://vercel.com/docs/vercel-blob). As imagens de cena são públicas; a solução do caso permanece somente no banco. A integração fornece `BLOB_READ_WRITE_TOKEN` às funções.
4. Configure `OPENAI_API_KEY` como segredo do projeto. Configure `GENERATION_PROVIDER=openai`. O juiz visual usa `gpt-6.1-terra` por padrão; `OPENAI_VISUAL_JUDGE_MODEL` permite escolher outro modelo com entrada de imagem e Structured Outputs. Para um teste sem consumo de créditos, use `GENERATION_PROVIDER=mock`.
5. A Vercel fornece a autenticação das filas nas funções. Para testar as filas localmente com `vercel dev`, execute `vercel link` e `vercel env pull` conforme a [documentação das Queues](https://vercel.com/docs/queues/quickstart).

Não use variáveis `VITE_` para segredos: elas entram no JavaScript entregue ao navegador.

## Criar as tabelas

Antes de publicar esta versão, execute `npm run db:migrate:vercel` com `DATABASE_URL` disponível no ambiente do terminal. O comando é idempotente e adiciona o estado e os pareceres do juiz visual aos casos existentes. Faça isso também para um banco novo de Preview, se usar ambientes separados. A migração não copia dados do SQLite local.

## Verificar a publicação

1. Acesse `/api/health` no domínio publicado; deve retornar `status: ok`.
2. Com `GENERATION_PROVIDER=mock`, crie três premissas, escolha uma, aguarde o caso e abra o dossiê. A imagem deve vir do Blob.
3. Abra o link do caso em outro navegador. Uma acusação no primeiro não deve liberar a revelação no segundo.
4. Troque para `GENERATION_PROVIDER=openai`, faça **um** caso real e confirme a premissa, a coerência das pistas e a imagem. Verifique no banco se `image_review_state` terminou em `passed` ou `fallback` e se `image_review_json` registrou o parecer. Reimplante após mudar variáveis de ambiente.

As funções de geração e revisão têm limite de 60 segundos no Hobby. Cada chamada de imagem usa timeout de 48 segundos e a revisão, 42 segundos. A revisão acontece em outra função para caber nesses limites. Se uma cena tiver defeito grave, a ferramenta gera outra uma única vez; se a revisão continuar reprovando ou falhar, publica uma cena SVG de reserva. O texto não tem fallback narrativo: a falha aparece no status para que a pessoa tente outro caso. A fila é durável, mas chamadas à OpenAI podem ser repetidas após uma interrupção.

## Limites e custos

A API limita globalmente a 15 conjuntos de premissas e cinco casos por hora. O plano Hobby da Vercel, o Blob e o Neon têm faixas gratuitas, com limites próprios. A OpenAI cobra separadamente pelas chamadas de texto e imagem. Configure um limite de gasto no projeto da OpenAI antes de divulgar o link amplamente. [Preços da Vercel](https://vercel.com/pricing) · [Blob](https://vercel.com/docs/vercel-blob/usage-and-pricing) · [OpenAI](https://developers.openai.com/api/docs/pricing)

## Estado da validação

`npm run check` cobre lint, tipos, testes locais e build. As funções Vercel foram checadas por TypeScript, mas o fluxo real com Neon, Blob e Queues só pode ser comprovado após conectar esses serviços e executar o roteiro acima. Nenhuma credencial foi adicionada ao repositório.
