# Plano de implementação

Cada task deve terminar com seus critérios de aceite passando antes da próxima começar.

## Progresso

- [x] Task 01 — Fundação do projeto
- [x] Task 02 — Configuração segura
- [x] Task 03 — Contratos do domínio
- [x] Task 04 — Persistência
- [x] Task 05 — Geração textual com IA
- [x] Task 06 — Geração da imagem
- [x] Task 07 — API pública do jogo
- [x] Task 08 — Tela de criação
- [ ] Task 09 — Tela de investigação
- [ ] Task 10 — Acusação única
- [ ] Task 11 — Revelação
- [ ] Task 12 — Controle de custos e robustez
- [ ] Task 13 — Testes finais e documentação

## Task 01 — Fundação do projeto

Entregas:

- Workspace npm com TypeScript.
- Aplicação React em `apps/web`.
- API Fastify em `apps/api`.
- Contratos compartilhados em `packages/contracts`.
- Scripts de desenvolvimento, lint, typecheck, teste e build.
- Rota `GET /api/health` consumida pela interface.

Critérios de aceite:

- O frontend abre em `http://localhost:5173`.
- A API responde em `http://localhost:3000/api/health`.
- A interface consegue consultar a saúde da API pelo proxy do Vite.
- `npm run lint`, `npm run typecheck`, `npm test` e `npm run build` passam.

## Task 02 — Configuração segura

Entregas:

- Exemplo versionado em `config.example.toml` sem chave real.
- Arquivo local `config.toml` protegido pelo `.gitignore`.
- Leitura e validação tipada de todas as seções do TOML.
- Erros de arquivo ausente, TOML inválido e campos inválidos sem exposição de valores.
- Resumo seguro que substitui a chave por `[REDACTED]`.
- API usando `server.host` e `server.port` validados.

Critérios de aceite:

- Uma configuração completa é carregada e tipada.
- A API falha antes de abrir a porta quando `config.toml` está ausente ou inválido.
- Mensagens de erro indicam os campos, mas nunca o valor da chave.
- Somente um resumo redigido pode ser registrado em log.

## Task 03 — Contratos do domínio

Entregas:

- Briefing com período, tipo de crime, cenário, dificuldade e tom.
- Schemas de suspeitos, documentos, pistas visuais e cena.
- Conteúdo público separado da solução privada.
- Contrato estruturado para a futura saída da IA.
- Estados públicos do processo de geração.
- Acusação por nome e resultado revelado.
- Validação cruzada de culpado, evidências, IDs e vínculo entre registros.

Critérios de aceite:

- Um caso coerente passa pela validação.
- Culpado inexistente ou evidência privada/inexistente é rejeitado.
- IDs duplicados são rejeitados.
- Campos privados fazem o schema público falhar.
- Caso público e solução privada precisam usar o mesmo ID.
- A acusação aceita um único nome não vazio.

## Task 04 — Persistência

Entregas:

- SQLite local com criação automática do diretório configurado.
- Migrações transacionais, versionadas e idempotentes.
- Tabelas separadas para casos e acusações.
- Estados persistidos de geração e mensagens de falha.
- Armazenamento separado de briefing, rascunho público, dossiê público e solução privada.
- Repositório de casos com validação de transições.
- Repositório de acusações com uma tentativa por caso garantida no banco.
- WAL, chaves estrangeiras e espera controlada para concorrência local.

Critérios de aceite:

- A migração inicial pode ser executada repetidamente sem duplicação.
- Um caso completo continua disponível depois de fechar e reabrir o banco.
- A leitura pública não contém a solução privada.
- Estados inválidos são recusados.
- A segunda acusação para o mesmo caso é recusada pelo banco.
- O limite futuro de geração pode consultar casos criados em uma janela de tempo.

## Task 05 — Geração textual com IA

Entregas:

- Provedor mock determinístico e sem custo.
- Provedor OpenAI usando Responses API e Structured Outputs.
- Prompt versionado `case-v1` com regras de mistério justo.
- Modelo, esforço, timeout, tentativas e limite de saída configuráveis.
- Chave obrigatória somente quando o provedor OpenAI estiver ativo.
- Uma chamada textual para caso, suspeitos, documentos, solução e prompt visual.
- Validação de schema, referências, quantidades e briefing preservado.
- Persistência de modelo, provedor, versão do prompt, response ID e tokens.
- Falhas públicas genéricas sem detalhes sensíveis do provedor.

Critérios de aceite:

- O mock gera um caso válido com as quantidades solicitadas e zero tokens.
- O provedor OpenAI monta uma requisição estruturada com controles de custo.
- Respostas incompletas ou com quantidades incorretas são recusadas.
- O serviço avança um caso válido para `generating_image`.
- Uma falha marca o caso como `failed` sem persistir detalhes sensíveis.
- Todos os testes automatizados rodam sem chamar a OpenAI.

## Task 06 — Geração da imagem

Entregas:

- Provedor mock que gera SVG local sem custo.
- Provedor OpenAI usando Image API com exatamente uma imagem.
- Modelo, qualidade, tamanho, formato, compressão e diretório configuráveis.
- Armazenamento local atômico com nome derivado do UUID do caso.
- URL pública separada do caminho interno do arquivo.
- Fallback SVG configurável quando o provedor externo falha.
- Persistência interna de provedor, modelo, tokens, arquivo e uso de fallback.
- Finalização do dossiê público e transição para `ready`.

Critérios de aceite:

- O mock conclui o caso com uma imagem local e zero tokens.
- A OpenAI recebe `n = 1` e todos os controles de custo configurados.
- Uma resposta sem imagem é recusada.
- Falha externa usa fallback e mantém o caso jogável quando habilitado.
- Falha sem fallback marca o caso como `failed` sem expor detalhes do provedor.
- Todos os testes automatizados rodam sem chamar a OpenAI.

## Task 07 — API pública do jogo

Entregas:

- `POST /api/cases` com validação do briefing e resposta `202`.
- Fila local assíncrona para orquestrar texto e imagem.
- `GET /api/cases/:caseId/status` para acompanhar o progresso.
- `GET /api/cases/:caseId` expondo somente o dossiê público pronto.
- Rota configurável para servir a imagem registrada no banco.
- Contrato uniforme de erros públicos.
- Encerramento gracioso que aguarda gerações em andamento.
- Validação de UUID, contenção de caminhos e cabeçalhos seguros nas imagens.

Critérios de aceite:

- Um briefing válido cria um caso e retorna imediatamente o estado `queued`.
- O fluxo mock passa por texto e imagem e termina em `ready`.
- O status e o dossiê podem ser consultados pelo UUID.
- Casos em andamento retornam `409` ao tentar abrir o dossiê.
- Entradas inválidas e registros inexistentes retornam erros consistentes.
- A API pública nunca contém a solução privada.
- A imagem gerada pode ser carregada pela URL presente no dossiê.

## Task 08 — Tela de criação

Entregas:

- Formulário responsivo com período, crime, cenário, dificuldade e tom.
- Campo condicional para períodos personalizados.
- Opções acessíveis por teclado usando controles de rádio reais.
- Integração tipada com `POST /api/cases`.
- Polling de `GET /api/cases/:caseId/status`.
- Tela de progresso para todas as etapas de geração.
- Exibição de falhas públicas com possibilidade de tentar novamente.
- Transição para `/cases/:caseId` quando o dossiê fica pronto.
- Proxy de desenvolvimento para API e imagens geradas.

Critérios de aceite:

- O formulário não pode ser enviado sem cenário ou período personalizado obrigatório.
- As escolhas são convertidas para o contrato compartilhado sem valores improvisados.
- O botão fica indisponível enquanto a API não estiver conectada.
- Um caso mock pode ser criado integralmente pelo navegador.
- O progresso acompanha os estados persistidos pela API.
- Falhas não deixam a interface presa na tela de carregamento.
- A interface funciona em telas grandes e pequenas.

## Próxima task

Task 09 implementará a tela de investigação com cena, suspeitos e leitura dos documentos do dossiê.
