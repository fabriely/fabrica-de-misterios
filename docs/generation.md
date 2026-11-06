# Geração textual de casos

A geração usa um provedor intercambiável definido por `generation.provider` no `config.toml`:

- `mock`: padrão de desenvolvimento, determinístico e sem chamadas externas.
- `openai`: usa a Responses API e consome créditos do projeto configurado.

## Fluxo

1. O caso pendente passa para `generating_case`.
2. O provedor recebe briefing e quantidades configuradas.
3. A saída estruturada é validada pelo schema compartilhado.
4. Uma segunda validação confere quantidades e preservação exata do briefing.
5. Rascunho público, solução privada, prompt visual e metadados de uso são persistidos.
6. O caso passa para `generating_image` e o fluxo descrito em [`images.md`](images.md) prepara a cena.

Em qualquer falha, o caso passa para `failed` com uma mensagem pública genérica. Detalhes do provedor e a chave nunca são persistidos como mensagem de erro.

## Prompt

O prompt atual é `case-v1`, localizado em `apps/api/src/generation/prompts/case-v1.ts`. Regras estáticas ficam separadas do briefing dinâmico para facilitar versionamento, testes e reaproveitamento de cache.

## OpenAI

O provedor usa:

- Responses API;
- `responses.parse`;
- Structured Outputs com o schema Zod do caso;
- modelo, esforço, timeout, tentativas e limite de saída vindos do TOML;
- `store: false`;
- uma única chamada textual por caso.

O mock deve ser usado durante desenvolvimento comum. Ative `provider = "openai"` apenas para testes reais e preencha a chave somente no `config.toml` local.

O procedimento completo para um primeiro teste real com limites conservadores está em [`openai-setup.md`](openai-setup.md).
