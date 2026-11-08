# Checklist de entrega do MVP

## Funcionalidade

- [x] O usuário escolhe período, crime, cenário, dificuldade e tom.
- [x] O caso contém três suspeitos, quatro documentos e uma cena por padrão.
- [x] O dossiê público não recebe a solução antes da acusação.
- [x] A acusação aceita um nome válido e permite uma única tentativa.
- [x] A revelação apresenta culpado, motivo, método, cronologia e provas.
- [x] O modo mock permite jogar o fluxo completo sem custo.

## Robustez e segurança

- [x] `config.toml` e dados gerados estão fora do Git.
- [x] A chave é usada somente pela API e aparece redigida no resumo de configuração.
- [x] Limite horário, concorrência, tamanho de corpo e recuperação após reinício estão ativos.
- [x] Erros públicos não expõem mensagens internas do provedor.
- [x] A solução privada permanece separada no banco e nos contratos HTTP.
- [x] A segunda acusação é impedida também por restrição transacional no SQLite.

## Qualidade

- [x] Existe um teste automatizado da jornada completa.
- [x] Os testes automatizados não chamam serviços externos.
- [x] `npm run check` executa toda a validação da entrega.
- [x] O procedimento manual em modo mock está documentado.
- [x] O primeiro teste real com a OpenAI está documentado com limites conservadores.

## Antes de publicar fora da máquina local

- [ ] Substituir a chave em TOML por variável de ambiente ou cofre de segredos.
- [ ] Adicionar autenticação de usuários e autorização por caso.
- [ ] Definir política de retenção para casos, imagens e logs.
- [ ] Configurar HTTPS, origem permitida, observabilidade e backups.
- [ ] Configurar limites e alertas de gasto no projeto da OpenAI.
- [ ] Executar testes de carga e uma revisão de segurança dedicada.

Esses itens não bloqueiam o MVP local, mas bloqueiam uma implantação pública segura.

