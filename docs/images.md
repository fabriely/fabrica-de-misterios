# Geração e armazenamento de imagens

Cada caso possui exatamente uma imagem de cena. O provedor acompanha `generation.provider`:

- `mock`: cria um SVG local determinístico, sem rede e sem custo;
- `openai`: usa a Image API com o modelo, qualidade, tamanho, formato e compressão definidos no `config.toml`.

## Fluxo

1. O serviço lê o prompt visual do rascunho em `generating_image`.
2. O provedor produz uma única imagem (`n = 1`).
3. A imagem é gravada atomicamente em `images.directory` com o UUID do caso.
4. Somente a URL pública configurada em `images.public_path` entra no dossiê público.
5. Provedor, modelo, caminho interno, tokens e uso de fallback ficam nos metadados internos.
6. O caso passa para `ready`.

Se a geração externa falhar e `images.fallback_enabled = true`, um SVG neutro é salvo no lugar dela e o caso continua utilizável. Se o fallback estiver desativado, o caso passa para `failed` com mensagem genérica.

## Custo e privacidade

O exemplo usa qualidade `low`, uma imagem e compressão WebP. O identificador de segurança enviado ao provedor é um hash do UUID do caso; briefing, chave e erros do provedor não são usados nesse identificador nem expostos na resposta pública.

Os testes automatizados simulam a Image API e nunca consomem créditos. A imagem pronta é servida pela rota pública configurada e só pode ser acessada quando pertence a um caso persistido.
