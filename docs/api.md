# API pública do jogo

A API cria o caso em segundo plano. O cliente recebe `202 Accepted` imediatamente e consulta o progresso até chegar a `ready` ou `failed`.

## Criar caso

`POST /api/cases`

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

A resposta contém `caseId`, `status`, `progress` e `errorMessage`.

## Consultar progresso

`GET /api/cases/:caseId/status`

Os estados possíveis são `queued`, `generating_case`, `generating_image`, `ready` e `failed`.

## Abrir dossiê

`GET /api/cases/:caseId`

Retorna o caso somente quando estiver pronto. Enquanto a geração estiver em andamento, retorna `409 case_not_ready`. A solução, o culpado e as evidências decisivas privadas nunca são incluídos.

## Imagem

O campo `scene.imageUrl` do dossiê aponta para o arquivo local. A rota valida o UUID, confere o arquivo registrado no banco e impede acesso a caminhos arbitrários. As imagens são servidas com tipo seguro, `nosniff`, política de conteúdo restrita e cache imutável.

## Acusação única

`POST /api/cases/:caseId/accusation`

```json
{
  "suspectName": "Helena Prado"
}
```

O nome é comparado sem diferenças de maiúsculas ou acentos, mas precisa corresponder a um único suspeito público. A primeira tentativa é persistida; qualquer tentativa posterior retorna `409 accusation_already_submitted`.

A resposta imediata contém apenas `caseId`, `correct`, `accusedName` e `submittedAt`. Culpado, motivo, método, cronologia e explicação continuam privados até a revelação.

`GET /api/cases/:caseId/accusation` retorna esse resultado mínimo depois que a chance foi usada, permitindo manter o bloqueio após atualizar a página.

## Erros

Erros públicos seguem o formato:

```json
{
  "code": "invalid_request",
  "message": "Os dados para criar o caso são inválidos."
}
```

Os códigos atuais são `invalid_request`, `not_found`, `case_not_ready`, `accusation_already_submitted` e `internal_error`. Detalhes internos dos provedores não são enviados ao cliente nem registrados pela fila de geração.
