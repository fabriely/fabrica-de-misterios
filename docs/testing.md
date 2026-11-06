# Testes do MVP

## Validação automatizada

O comando de entrega executa lint, checagem de tipos, testes e build:

```powershell
npm run check
```

Os testes usam banco SQLite em memória, diretórios temporários e provedores simulados. Eles não acessam a OpenAI nem consomem créditos.

O teste de integração em `apps/api/src/http/game-routes.test.ts` percorre a jornada completa: cria o caso, drena a fila, consulta o status, abre o dossiê e a imagem, acusa um suspeito, revela a solução e confirma que uma segunda tentativa é bloqueada. Os demais testes cobrem validação, persistência, falhas, limites, concorrência e recuperação.

## Teste manual sem custo

1. Confirme `generation.provider = "mock"` no `config.toml`.
2. Execute `npm run dev`.
3. Abra `http://localhost:5173`.
4. Crie um caso com qualquer combinação válida.
5. Aguarde o redirecionamento automático para o dossiê.
6. Leia a cena, os suspeitos e todos os documentos.
7. Faça anotações e recarregue a página para confirmar a persistência local.
8. Acuse um suspeito e confirme que não aparece uma segunda chance.
9. Abra a solução, confira a linha do tempo e as provas decisivas.
10. Recarregue novamente e confirme que o resultado continua disponível.

Também vale repetir os passos principais em uma janela estreita do navegador para revisar o layout móvel.

## Teste real com custo

Faça somente depois que `npm run check` passar. Use o procedimento controlado de [`openai-setup.md`](openai-setup.md) e gere apenas um caso na primeira validação.

