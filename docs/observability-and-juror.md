# Observabilidade e Jurado de IA (v2)

## Funcionalidades

- Métricas persistidas por caso: geração de premissas, texto, cena, retratos, revisão visual, revisão de qualidade narrativa e julgamento. Cada nova tentativa de cena e sua revisão são registradas separadamente. Operações malsucedidas também são registradas com duração e custo **desconhecido** quando o provedor não fornece faturamento por tentativa.
- Custo em USD **estimado**, com tabela de preços informada explicitamente pelo operador; sem preços configurados, o valor aparece como `null` / não precificado. O painel apresenta tanto tempo total de geração (parede) quanto soma de latências de operações, que não representa tempo de parede (cena e retratos são paralelos).
- Qualidade separada em solucionabilidade (30), lógica (25), evidências (20), justiça (15) e originalidade (10). O avaliador LLM recebe dossiê público e solução privada; é uma estimativa, não certificação da consistência do enredo.
- Jurado LLM: suspeito selecionado por ID, argumentação livre, análise de evidências (30), motivo (15), método (10), cronologia (10) e acerto do culpado calculado **no servidor** (35). Parecer persistido e recuperável; retriable em falha sem segunda acusação. Provedor `mock` dá zero nos critérios interpretativos e registra aviso explícito de simulação.
- A revelação da solução agora ocorre exclusivamente após ação do jogador; ao reabrir o caso, o veredito é carregado, não o gabarito.

## APIs

- `GET /api/cases/:caseId/insights` — operações sem dados secretos + nota de qualidade (os achados narrativos detalhados não são expostos ao jogador). Prototipagem pública por ID do caso; autenticação deve ser adicionada antes de expor relatórios financeiros privados.
- `POST /api/cases/:caseId/accusation` com `X-Player-Id: uuid`, corpo `{ "suspectId": "suspect_1", "argument": "Minha tese ..." }`. Aceita também `suspectName` legado, para não quebrar clientes antigos.
- `GET /api/cases/:caseId/judgment` — exige acusação prévia do jogador.
- `POST /api/cases/:caseId/judgment` — retenta julgamentos falhos, sem criar nova acusação.
- `GET /api/cases/:caseId/reveal` — exige acusação; mantém a solução oficial fora das respostas de métricas e julgamento.

## Variáveis de ambiente

- `JUDGE_PROVIDER=mock|openai` (opcional; herda `GENERATION_PROVIDER` se ausente).
- `OPENAI_JUDGE_MODEL` (opcional; herda `OPENAI_TEXT_MODEL` na Vercel ou `openai.text_model` do TOML no modo local).
- `AI_PRICING_JSON` (opcional), objeto JSON de modelos para tarifas. Exemplos **fictícios**, NÃO representam preços atuais:

```json
{"nome-do-modelo-texto":{"inputPerMillion":1,"outputPerMillion":4},"nome-do-modelo-imagem":{"perImage":0.04}}
```

A configuração só calcula preços fornecidos. Retornos de imagem do fallback são classificados como custo desconhecido, pois a chamada anterior pode ter sido faturada.

Para os modelos padrão, o `.env` local contém as tarifas Standard consultadas em 17/11/2026: `gpt-6-luna` (entrada US$ 0,10 e saída US$ 0,50 por milhão de tokens) e `gpt-image-2.5-flare` (entrada de texto US$ 5, entrada de imagem US$ 8 e saída de imagem US$ 30 por milhão de tokens). Fontes: [GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna) e [GPT Image 2.5 Flare](https://developers.openai.com/api/docs/models/gpt-image-2.5-flare). A estimativa de imagem requer a divisão de tokens de entrada retornada pela API. Na Vercel, configure `AI_PRICING_JSON` nas variáveis do projeto também. Operações já salvas não são recalculadas quando a tarifa muda.

## Aplicação e verificações

1. No modo local, faça backup do SQLite antes de iniciar; `006-ai-operations...` é aplicada automaticamente pelo `openDatabase`.
2. Na Vercel, execute `npm run db:migrate:vercel` com `DATABASE_URL_UNPOOLED` configurada. A migração cria novas tabelas sem descartar dados anteriores.
3. Confirme o modo `mock` antes de realizar testes sem custos. Para testes reais configure chave e modelos válidos.
4. Execute `npm ci`, `npm run check`, gere um caso novo, consulte as métricas, faça acusação fundamentada, consulte o julgamento, recarregue o dossiê e abra o gabarito sob demanda.
5. Em PostgreSQL/Vercel, verifique permissões e provisionamento das filas; a integração real ainda depende de homologação no ambiente do projeto.

## Limitações explícitas

- A precificação não faz conciliação com faturamento OpenAI. Não atribui custos reais a operações que não retornam uso ou não possuem tarifa cadastrada.
- Casos gerados anteriormente não têm métricas retroativas; acusações anteriores não possuem texto para o jurado.
- A identidade do jogador continua sendo um UUID salvo no navegador, **não** login autenticado. O limite de uma tentativa vale por identificador, não por pessoa.
- A LLM pode julgar incorretamente e o parecer precisa ser calibrado por casos de referência; nunca pode alterar `culpritId`.
- A classificação de qualidade pode ser enganada por textos dos casos; não existe prova formal automática de solucionabilidade.
- Requisições simultâneas e retomada das quatro filas Vercel (`case-text`, `case-image`, `case-image-review` e `case-quality`) exigem testes operacionais, inclusive timeout do provedor e conflitos de atualização.
