# API pública do jogo

A API primeiro gera três premissas sem spoilers. Depois que a pessoa escolhe uma, cria o caso em segundo plano. O cliente recebe `202 Accepted` e consulta o progresso até chegar a `ready` ou `failed`.

## Gerar premissas

`POST /api/premises`

```json
{
  "briefing": {
    "period": "victorian",
    "customPeriod": null,
    "crimeType": "theft",
    "setting": "Hotel isolado nas montanhas",
    "difficulty": "medium",
    "tone": "classic"
  }
}
```

A resposta contém `id`, o briefing e três opções com `id`, `title` e `synopsis`. Nenhuma opção traz culpado ou solução.

## Criar caso

`POST /api/cases`

```json
{
  "premiseSetId": "bb605bfc-f63b-4242-b0d8-8190ff25c3ef",
  "premiseId": "premise_2"
}
```

A resposta contém `caseId`, `status`, `progress` e `errorMessage`.

## Consultar progresso

`GET /api/cases/:caseId/status`

Os estados possíveis são `queued`, `generating_case`, `generating_image`, `ready` e `failed`.

## Abrir dossiê

`GET /api/cases/:caseId`

Retorna o caso somente quando estiver pronto. Enquanto a geração estiver em andamento, retorna `409 case_not_ready`. A solução, o culpado e as evidências decisivas privadas nunca são incluídos.

## Imagem

O campo `scene.imageUrl` aponta para o arquivo local em desenvolvimento e para um endereço público do Vercel Blob na publicação. A solução nunca é incluída na imagem.

## Acusação única

`POST /api/cases/:caseId/accusation`

```json
{
  "suspectName": "Helena Prado"
}
```

As rotas de acusação e revelação exigem o cabeçalho `X-Player-Id` com um UUID aleatório gerado pelo navegador e guardado localmente. O nome é comparado sem diferenças de maiúsculas ou acentos, mas precisa corresponder a um único suspeito público. A primeira tentativa **daquele jogador naquele caso** é persistida; qualquer tentativa posterior dele retorna `409 accusation_already_submitted`.

A resposta imediata contém apenas `caseId`, `correct`, `accusedName` e `submittedAt`. Culpado, motivo, método, cronologia e explicação continuam privados até a revelação.

`GET /api/cases/:caseId/accusation` retorna esse resultado mínimo depois que a chance foi usada, permitindo manter o bloqueio após atualizar a página.

## Revelação

`GET /api/cases/:caseId/reveal`

Antes da acusação do jogador identificado no cabeçalho, esse endpoint retorna `403 accusation_required`. Depois da tentativa única, retorna o resultado completo com culpado, motivo, método, cronologia, evidências decisivas e explicação. Outro navegador com o mesmo link continua sem acesso à solução até fazer sua própria acusação.

As evidências decisivas são IDs de documentos e pistas visuais que já faziam parte do dossiê público. Acusações salvas antes do schema 4 são atualizadas automaticamente com esses vínculos.

## Erros

Erros públicos seguem o formato:

```json
{
  "code": "invalid_request",
  "message": "Os dados para criar o caso são inválidos."
}
```

Os códigos atuais são `invalid_request`, `not_found`, `case_not_ready`, `accusation_already_submitted`, `accusation_required`, `generation_limit_reached` e `internal_error`. Detalhes internos dos provedores não são enviados ao cliente nem registrados pela fila de geração.
