# Geração e armazenamento de imagens

Cada caso novo recebe uma imagem da cena e uma prancha com um retrato por suspeito. A interface mostra o painel correspondente a cada pessoa na ficha e na revelação final. Casos anteriores, sem prancha, continuam exibindo as iniciais.

O provedor acompanha `generation.provider`:

- `mock`: cria SVGs locais determinísticos, sem rede e sem custo;
- `openai`: usa a Image API com o modelo, qualidade, tamanho, formato e compressão configurados. São duas gerações de imagem por caso, feitas em paralelo.

## Fluxo

1. O serviço lê o prompt da cena e as descrições públicas dos suspeitos em `generating_image`.
2. O provedor gera uma cena e uma prancha de painéis verticais, na mesma ordem dos suspeitos no dossiê. Cada chamada pede uma imagem (`n = 1`). O prompt dos retratos não recebe a solução privada.
3. As duas imagens são armazenadas separadamente. No desenvolvimento local, o nome da prancha termina em `-portraits`; na Vercel, ambas são salvas no Blob.
4. Somente as URLs públicas entram no dossiê. A página usa a posição de cada suspeito para mostrar seu painel da prancha.
5. O caso passa para `ready` depois que as duas imagens estão disponíveis.

Se a Image API falhar, um SVG neutro substitui a imagem correspondente. Na API local, o fallback pode ser desativado em `images.fallback_enabled`; nesse caso, a falha impede a conclusão do caso.

## Custo e privacidade

O exemplo usa qualidade `low` e compressão WebP. Como há duas chamadas de imagem por caso, o custo de imagens de um caso novo é aproximadamente o dobro do fluxo anterior. O identificador de segurança enviado ao provedor deriva de um hash do UUID do caso. A chave e a solução privada não entram no prompt visual nem na resposta pública.

Os testes automatizados simulam a Image API e não consomem créditos. Casos já salvos continuam válidos sem migrar o banco de dados.
