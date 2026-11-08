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
- [x] Task 09 — Tela de investigação
- [x] Task 10 — Acusação única
- [x] Task 11 — Revelação
- [x] Task 12 — Controle de custos e robustez
- [x] Task 13 — Testes finais e documentação

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

## Task 09 — Tela de investigação

Entregas:

- Carregamento tipado do dossiê público por UUID.
- Rota persistente `/cases/:caseId`, inclusive após recarregar a página.
- Visão geral com imagem, incidente e pistas visuais.
- Fichas completas de suspeitos com ligação ao caso e álibi.
- Grade de documentos com leitura integral em diálogo acessível.
- Caderno de anotações salvo localmente por caso.
- Estados de carregamento, caso inexistente e falha da API.
- Navegação responsiva entre visão geral, suspeitos e documentos.
- Área de acusação visível, mas bloqueada até a regra de tentativa única.

Critérios de aceite:

- Um caso `ready` pode ser aberto diretamente pelo UUID.
- Cena, suspeitos, documentos e pistas correspondem ao contrato público.
- Cada documento pode ser aberto, lido e fechado por botão ou tecla Escape.
- Atualizar a página não perde o caso nem as anotações locais.
- Nenhum campo da solução privada é solicitado ou renderizado.
- Casos inválidos ou inexistentes apresentam recuperação amigável.
- A interface funciona em telas grandes e pequenas.

## Task 10 — Acusação única

Entregas:

- Endpoint para acusar um suspeito pelo nome.
- Normalização de espaços, caixa e acentos no servidor.
- Validação de correspondência com exatamente um suspeito público.
- Persistência transacional do resultado completo e privado.
- Resposta imediata mínima, sem motivo, método ou identidade privada do culpado.
- Restrição única no SQLite como proteção contra concorrência.
- Consulta do resultado mínimo para preservar o bloqueio após recarregar.
- Diálogo acessível com seleção e confirmação explícita.
- Resultado visual de acerto ou erro sem liberar nova tentativa.

Critérios de aceite:

- Um nome válido registra exatamente uma acusação.
- Variações de caixa e acentos não alteram a comparação.
- Nome inexistente ou ambíguo é recusado.
- A segunda tentativa retorna conflito, inclusive após recarregar a página.
- Duas requisições simultâneas não conseguem criar duas acusações.
- O frontend nunca recebe a solução completa nesta etapa.
- Acerto e erro ficam persistidos e visíveis ao reabrir o caso.

## Task 11 — Revelação

Entregas:

- Endpoint de revelação protegido pela existência da acusação.
- Culpado, motivo, método, cronologia e explicação completos.
- IDs das evidências decisivas ligados aos documentos e pistas públicas.
- Migração do schema 4 para acusações já persistidas.
- Tela de solução com veredito do jogador e identidade do culpado.
- Linha do tempo visual dos acontecimentos.
- Destaque das provas que demonstravam a solução.
- Ações para rever o dossiê ou criar um novo caso.

Critérios de aceite:

- A revelação é recusada antes da acusação.
- Acertar ou errar libera a mesma solução completa.
- O resultado imediato da Task 10 continua sem dados privados.
- A cronologia e as evidências correspondem à solução persistida.
- Acusações antigas continuam legíveis após a migração.
- Atualizar a página mantém a possibilidade de abrir a solução.
- A tela funciona em desktop e dispositivos móveis.

## Task 12 — Controle de custos e robustez

Entregas:

- Limite persistido de novos casos por janela de uma hora.
- Cabeçalho `Retry-After` e erro público `429` ao exceder o orçamento.
- Fila com concorrência configurável e isolamento de falhas.
- Recuperação de casos enfileirados após reinício.
- Falha segura de chamadas externas interrompidas, sem repetição automática.
- Limite configurável para corpos HTTP.
- Tratamento global de JSON inválido, rotas inexistentes e erros inesperados.
- Cabeçalhos básicos de segurança nas respostas.
- Bloqueio de duplo envio e nova consulta periódica de saúde no frontend.

Critérios de aceite:

- O caso que excede o limite horário não é persistido nem enviado ao provedor.
- A fila nunca ultrapassa a concorrência configurada.
- Uma falha não impede que o próximo item da fila seja processado.
- Reiniciar a API recupera `queued` e não repete etapas externas interrompidas.
- Erros inesperados não expõem mensagens internas ao cliente.
- Corpos excessivos e JSON inválido são recusados de forma consistente.
- O modo mock continua sendo o padrão sem custo.

## Task 13 — Testes finais e documentação

Entregas:

- Teste automatizado da jornada completa, da criação à revelação.
- Comando único `npm run check` para validar a entrega.
- Auditoria de configuração local e separação da solução privada.
- Roteiro de teste manual sem custo.
- Guia para um único teste real com a OpenAI e limites conservadores.
- Checklist do MVP e das exigências adicionais antes de publicação.
- README final com escopo, execução e mapa da documentação.

Critérios de aceite:

- A jornada completa passa usando apenas provedores mock.
- Uma segunda acusação continua bloqueada no teste ponta a ponta.
- Nenhum teste automatizado chama ou consome créditos da OpenAI.
- `config.toml` permanece ignorado e nenhuma chave real é versionada.
- `npm run check` passa integralmente.
- O uso real da OpenAI pode ser ativado sem colocar a chave no frontend.
- Limitações do MVP local e pendências para produção estão explícitas.

## Estado do plano

As 13 tasks do MVP local estão concluídas. O próximo ciclo pode priorizar publicação segura, autenticação, histórico de casos ou melhorias na qualidade da geração.
