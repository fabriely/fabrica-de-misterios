# Custos e robustez operacional

## Limites de custo

As proteções são aplicadas antes de criar o registro e chamar qualquer provedor:

- `generation.max_case_generations_per_hour` limita tentativas persistidas em uma janela de uma hora;
- `generation.max_concurrent_generations` limita quantos fluxos podem usar os provedores simultaneamente;
- `generation.image_count` permanece fixo em `1` pelo schema;
- `openai.max_output_tokens`, `openai.image_quality`, timeout e tentativas continuam configuráveis;
- o modo `mock` permanece como padrão e não consome créditos.

Quando o limite por hora é alcançado, `POST /api/cases` retorna `429 generation_limit_reached` com o cabeçalho `Retry-After`.

## Reinícios

Ao iniciar, a API trata estados persistidos da seguinte forma:

- casos `queued` voltam para a fila local;
- casos em `generating_case` ou `generating_image` passam para `failed` com mensagem pública genérica;
- casos `ready` e acusações não são alterados.

Uma chamada externa interrompida não é repetida automaticamente, evitando uma possível cobrança duplicada.

## Fila e encerramento

A fila respeita a concorrência configurada, continua após falhas individuais e pode ser drenada durante o encerramento gracioso. Falhas inesperadas também tentam deixar o caso em um estado terminal seguro.

## HTTP

`server.body_limit_kb` limita o corpo das requisições. Respostas incluem `nosniff`, proteção contra frames e política de referência restrita. JSON inválido, corpo excessivo, rotas desconhecidas e erros internos usam o contrato público de erros; detalhes e mensagens internas não são enviados ao cliente.

## Interface

O formulário bloqueia reenvios enquanto a primeira criação ainda está sendo aceita. A saúde da API é consultada novamente periodicamente, permitindo recuperar o botão sem atualizar a página quando o servidor volta a ficar online.
