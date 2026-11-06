# Interface de criação

A página inicial permite montar o briefing do caso sem editar JSON ou chamar a API manualmente.

## Campos

- período histórico, incluindo opção personalizada;
- tipo de crime;
- cenário em texto livre;
- dificuldade;
- tom da narrativa.

O formulário usa os mesmos valores dos contratos compartilhados. Após o envio, a interface cria o caso e consulta seu status a cada segundo, apresentando as etapas `queued`, `generating_case`, `generating_image` e `ready`.

Quando o caso fica pronto, a URL muda para `/cases/:caseId` e abre a investigação completa.

## Investigação

A rota `/cases/:caseId` carrega o dossiê público persistido e oferece três áreas:

- visão geral com cena, incidente e pistas visuais;
- fichas dos suspeitos com vínculo e álibi;
- documentos que podem ser abertos e lidos integralmente.

O caderno do investigador salva anotações no armazenamento local do navegador, separado por caso. Recarregar ou abrir diretamente a URL mantém o acesso ao dossiê enquanto ele existir no banco.

A solução privada não é solicitada pelo frontend. A acusação apresenta os suspeitos por nome, exige confirmação e registra uma única tentativa. Depois do envio, a interface mostra apenas acerto ou erro e mantém o caso bloqueado mesmo após atualizar a página.

Erros públicos da API aparecem no próprio formulário. A requisição e o polling são cancelados se a tela for desmontada, evitando atualizações tardias de estado.

## Desenvolvimento

Com a API e o frontend ativos, abra `http://localhost:5173`. O Vite encaminha tanto `/api` quanto `/generated-images` para a API local.
