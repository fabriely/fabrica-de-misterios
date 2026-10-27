# Arquitetura da Fábrica de Mistérios

## O que está no repositório hoje

A aplicação Vite/React implementa as seis telas e usa dados de demonstração em `src/demo/case.ts`. Não há chamadas de IA, banco de dados ou API de servidor. Isso permite apresentar e testar a navegação sem credenciais externas.

## Arquitetura alvo para a versão funcional

O arquivo [`fabrica-de-misterios.dsl`](fabrica-de-misterios.dsl) contém duas visões C4 editáveis: contêineres do sistema e componentes da API de orquestração. Abra-o no [Structurizr Playground](https://playground.structurizr.com/) para visualizar ou exportar as imagens.

| Parte | Responsabilidade |
| --- | --- |
| Aplicação Web, React + TypeScript | Coletar escolhas, mostrar premissas e dossiê público, registrar investigação e enviar acusação. |
| API, funções de servidor Node.js + TypeScript | Validar entradas, montar instruções de criação, chamar os modelos, conferir coerência, controlar acesso à solução e avaliar acusações. |
| OpenAI API | Gerar premissas e caso em estrutura definida; gerar imagem da cena após a validação textual. |
| PostgreSQL | Persistir briefing, premissa, caso público, solução privada, versão de prompt/modelo e veredito. |
| Armazenamento de objetos | Guardar a imagem gerada e associá-la ao ID do caso. |

### Fluxo de criação

1. A interface envia cenário, personagens e tipos de pista. A API valida limites, gera opções de premissa sem revelar culpado nem solução e devolve somente essas opções.
2. Após a escolha, o **montador de instruções no servidor** combina o briefing com um prompt versionado de criação de mistérios. A ordem solicitada ao modelo é: definir verdade e cronologia privadas; criar álibis e contradições; produzir pistas públicas suficientes; gerar documentos; preencher uma estrutura de saída separando `publicCase` e `privateSolution`.
3. O validador confere esquema, IDs, sequência dos eventos, relação entre pistas e solução, e ausência de fatos decisivos inéditos na revelação. Falhas podem provocar uma tentativa de correção com limite definido.
4. A API salva o caso aprovado sob um ID. Somente o dossiê público e a referência da imagem podem ser obtidos pela rota de leitura do caso. A solução não aparece em respostas de geração, leitura ou compartilhamento.
5. A acusação é enviada à API. Ela compara o palpite com a solução privada, grava o veredito e só então devolve a explicação e a cronologia revelada.

Uma imagem gerada pode enriquecer a imersão, mas o texto do dossiê precisa registrar todas as pistas decisivas. A especificação visual é derivada do caso já validado, para evitar que a cena contradiga a solução.

### Contrato previsto entre interface e API

| Ação | Rota prevista | Resposta pública |
| --- | --- | --- |
| Gerar premissas | `POST /api/premises` | Três opções com título e sinopse sem spoilers. |
| Criar caso | `POST /api/cases` | `caseId` e estado de geração. |
| Abrir caso | `GET /api/cases/:id` | Dossiê público, suspeitos, documentos, hotspots e imagem. |
| Acusar | `POST /api/cases/:id/accusations` | Veredito e solução revelada depois da acusação. |

O endereço para compartilhar será `/casos/:id`. O servidor deverá impedir que dados privados sejam serializados em qualquer resposta anterior à acusação. O próprio ID não deve conferir acesso à solução.

### Dados e implantação

Um esquema mínimo de persistência contém `cases` (`id`, `briefing`, `premise`, `public_case`, `private_solution`, `prompt_version`, `model`, `status`, `created_at`, `image_url`) e `accusations` (`id`, `case_id`, `suspect_id`, `evidence_ids`, `reasoning`, `verdict`, `created_at`). A versão inicial pode manter notas e progresso no navegador; persistência por pessoa e autenticação ficam para uma evolução posterior.

Na Vercel, as funções da pasta raiz `api/` podem hospedar a API. Uma integração PostgreSQL do Marketplace fornece a conexão ao servidor; credenciais de IA e banco são configuradas como variáveis de ambiente **somente do servidor**. Não colocar segredos em `src/`, no GitHub ou em variáveis `VITE_*`.

Antes de habilitar geração pública com credenciais do grupo, definir limites de requisições e custo por pessoa ou exigir acesso controlado. Funções que chamam modelos precisam tratar tempo limite, falhas e casos com validação recusada.

### Ordem de implementação sugerida

1. Extrair tipos compartilhados de caso e substituir a demonstração local por um cliente de API, preservando o fluxo visual.
2. Criar funções de premissas e geração estruturada com instruções versionadas e validação automática.
3. Persistir caso e solução privada no PostgreSQL; entregar somente dossiê público na leitura.
4. Implementar acusação no servidor e compartilhamento por ID.
5. Adicionar imagem de pista, observabilidade e limites de uso.
6. Testar com pessoas de fora do grupo, sem explicação por cima do ombro.

**Critério de pronto para a versão funcional:** duas pessoas abrem o mesmo ID e veem o mesmo dossiê; nenhuma resposta pública contém a solução antes da acusação; escolhas do briefing mudam o caso; o veredito é calculado no servidor; o caso é solucionável usando somente pistas acessíveis.
