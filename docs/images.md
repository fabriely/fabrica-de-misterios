# Geração e armazenamento de imagens

Cada caso novo recebe uma imagem da cena e uma prancha com um retrato por suspeito. A interface mostra o painel correspondente a cada pessoa na ficha e na revelação final. Casos anteriores, sem prancha, continuam exibindo as iniciais.

O provedor acompanha `generation.provider`:

- `mock`: cria SVGs locais determinísticos, sem rede e sem custo;
- `openai`: usa a Image API com o modelo, qualidade, tamanho, formato e compressão configurados. São duas gerações de imagem por caso, feitas em paralelo.

## Fluxo

1. O serviço lê o prompt da cena e as descrições públicas dos suspeitos em `generating_image`.
2. O provedor gera uma cena e uma prancha de painéis verticais, na mesma ordem dos suspeitos no dossiê. Cada chamada pede uma imagem (`n = 1`). O prompt dos retratos não recebe a solução privada.
3. As duas imagens são armazenadas separadamente. No desenvolvimento local, o nome da prancha termina em `-portraits`; na Vercel, ambas são salvas no Blob.
4. Se a cena veio da OpenAI, um modelo de visão inspeciona a própria imagem, com atenção a anatomia, proporção entre pessoas e móveis, perspectiva, cenário e pistas. O parecer estruturado separa defeitos menores dos graves.
5. Uma cena com defeito grave é gerada novamente uma vez, com orientações específicas do parecer, e passa por outra revisão. Se a segunda versão falhar ou o juiz ficar indisponível, a cena é substituída por um SVG neutro. A prancha de suspeitos é preservada e não passa por esta revisão.
6. Somente as URLs públicas entram no dossiê. A página usa a posição de cada suspeito para mostrar seu painel da prancha. O caso passa para `ready` depois da revisão ou da imagem reserva.

Se a Image API falhar, um SVG neutro substitui a imagem correspondente. Na API local, o fallback pode ser desativado em `images.fallback_enabled`; nesse caso, a falha impede a conclusão do caso. Na Vercel, o banco registra o estado da revisão, o número de tentativas e os pareceres; é preciso executar `npm run db:migrate:vercel` antes de publicar a nova versão.

## Custo e privacidade

O exemplo usa qualidade `low` e compressão WebP. Um caso faz duas gerações de imagem e uma revisão visual; se a primeira cena for rejeitada, faz uma geração e uma revisão adicionais. O modelo do juiz pode ser ajustado com `OPENAI_VISUAL_JUDGE_MODEL` (padrão: `gpt-6.1-terra`). O identificador de segurança enviado ao provedor deriva de um hash do UUID do caso. A chave e a solução privada não entram no prompt visual nem na resposta pública. O juiz reduz erros visuais evidentes, mas não garante que todos sejam detectados.

Os testes automatizados simulam a Image API e o juiz, sem consumir créditos. Casos já salvos continuam válidos após a migração do banco da Vercel.
