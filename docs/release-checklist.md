# Checklist de entrega do MVP

## Funcionalidade

- [x] O usuário escolhe período, crime, cenário, dificuldade e tom.
- [x] A pessoa escolhe uma de três premissas sem spoilers antes da geração completa.
- [x] O caso contém três suspeitos, quatro documentos e uma cena por padrão.
- [x] O dossiê público não recebe a solução antes da acusação.
- [x] A acusação aceita um nome válido e permite uma única tentativa por jogador e caso.
- [x] A revelação apresenta culpado, motivo, método, cronologia e provas.
- [x] O modo mock permite jogar o fluxo completo sem custo.

## Robustez e segurança

- [x] `config.toml` e dados gerados estão fora do Git.
- [x] A chave é usada somente pela API e aparece redigida no resumo de configuração.
- [x] Limite horário, concorrência, tamanho de corpo e recuperação após reinício estão ativos.
- [x] Erros públicos não expõem mensagens internas do provedor.
- [x] A solução privada permanece separada no banco e nos contratos HTTP.
- [x] A segunda acusação é impedida por restrição única no SQLite local e no Postgres da Vercel.

## Qualidade

- [x] Existe um teste automatizado da jornada completa.
- [x] Os testes automatizados não chamam serviços externos.
- [x] `npm run check` executa toda a validação da entrega.
- [x] O procedimento manual em modo mock está documentado.
- [x] O primeiro teste real com a OpenAI está documentado com limites conservadores.

## Antes de publicar fora da máquina local

- [x] A versão Vercel lê a chave exclusivamente de `OPENAI_API_KEY` no servidor.
- [x] Acusação e revelação são isoladas por jogador anônimo.
- [ ] Configurar Neon, Blob, Queues e segredos no projeto Vercel; executar o teste publicado.
- [ ] Adicionar contas se o produto exigir identidade entre dispositivos.
- [ ] Definir política de retenção para casos, imagens e logs.
- [ ] Configurar HTTPS, origem permitida, observabilidade e backups.
- [ ] Configurar limites e alertas de gasto no projeto da OpenAI.
- [ ] Executar testes de carga e uma revisão de segurança dedicada.

O roteiro de configuração e teste está em [deploy-vercel.md](deploy-vercel.md). Ainda não houve teste com credenciais reais dos serviços externos.

