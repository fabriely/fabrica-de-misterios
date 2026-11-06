# Plano de implementação

Cada task deve terminar com seus critérios de aceite passando antes da próxima começar.

## Progresso

- [x] Task 01 — Fundação do projeto
- [x] Task 02 — Configuração segura
- [x] Task 03 — Contratos do domínio
- [ ] Task 04 — Persistência
- [ ] Task 05 — Geração textual com IA
- [ ] Task 06 — Geração da imagem
- [ ] Task 07 — API pública do jogo
- [ ] Task 08 — Tela de criação
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

## Próxima task

Task 04 implementará SQLite, migrações e repositórios para casos e acusações.
