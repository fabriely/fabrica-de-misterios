# Interface de criação

A página inicial permite montar o briefing do caso sem editar JSON ou chamar a API manualmente.

## Campos

- período histórico, incluindo opção personalizada;
- tipo de crime;
- cenário em texto livre;
- dificuldade;
- tom da narrativa.

O formulário usa os mesmos valores dos contratos compartilhados. Após o envio, a interface cria o caso e consulta seu status a cada segundo, apresentando as etapas `queued`, `generating_case`, `generating_image` e `ready`.

Quando o caso fica pronto, a URL muda para `/cases/:caseId`. Por enquanto essa rota apresenta uma confirmação; a Task 09 transformará esse destino na investigação completa.

Erros públicos da API aparecem no próprio formulário. A requisição e o polling são cancelados se a tela for desmontada, evitando atualizações tardias de estado.

## Desenvolvimento

Com a API e o frontend ativos, abra `http://localhost:5173`. O Vite encaminha tanto `/api` quanto `/generated-images` para a API local.
