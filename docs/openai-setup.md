# Teste real com a OpenAI

O desenvolvimento e todos os testes automatizados devem continuar usando `generation.provider = "mock"`. Ative a OpenAI somente para um teste manual deliberado: cada caso faz uma chamada textual e tenta gerar exatamente uma imagem.

## 1. Criar a configuração local

Se ainda não existir um `config.toml` na raiz:

```powershell
Copy-Item config.example.toml config.toml
```

O arquivo é ignorado pelo Git. Nunca coloque a chave no `config.example.toml`, no frontend, em commits, capturas de tela ou mensagens.

## 2. Configurar o teste mais econômico

Edite somente o `config.toml` local:

```toml
[openai]
api_key = "COLE_SUA_CHAVE_LOCAL_AQUI"
text_model = "gpt-6-luna"
image_model = "gpt-image-2.5-flare"
reasoning_effort = "low"
image_quality = "low"
timeout_seconds = 120
max_retries = 0
max_output_tokens = 8000

[generation]
provider = "openai"
suspect_count = 3
document_count = 4
image_count = 1
max_case_generations_per_hour = 1
max_concurrent_generations = 1
```

Use uma chave de projeto criada no painel da OpenAI. O MVP lê a chave somente no servidor e a envia por autenticação Bearer. A documentação oficial recomenda não expor chaves em código cliente ou controle de versão: [autenticação da API](https://developers.openai.com/api/reference/overview#authentication) e [chaves de projeto](https://developers.openai.com/api/docs/guides/api-keys).

Os modelos do exemplo foram escolhidos para custo controlado: `gpt-6-luna` suporta Responses API e Structured Outputs, e `gpt-image-2.5-flare` é voltado a geração rápida de imagens. Consulte as páginas oficiais antes de um teste, pois preço e disponibilidade podem mudar: [GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna), [GPT Image 2.5 Flare](https://developers.openai.com/api/docs/models/gpt-image-2.5-flare) e [geração de imagens](https://developers.openai.com/api/docs/guides/image-generation).

## 3. Executar um único caso

```powershell
npm run dev
```

Abra `http://localhost:5173`, crie um caso e espere o estado ficar pronto. Confira a cena, os suspeitos e os quatro documentos; faça uma acusação e abra a revelação.

Antes de tentar novamente, verifique o painel de uso da OpenAI. O limite local de uma criação por hora reduz acionamentos acidentais, mas não substitui limites e alertas de gasto configurados no projeto da OpenAI. Uma requisição que falha também pode ter consumido recursos; o fallback SVG garante jogabilidade, não estorno.

Algumas contas podem precisar concluir a verificação da organização para usar modelos GPT Image, conforme o [guia oficial de imagens](https://developers.openai.com/api/docs/guides/image-generation#overview).

## 4. Voltar ao modo sem custo

Depois do teste, altere imediatamente:

```toml
[generation]
provider = "mock"
```

Também é recomendável remover a chave do arquivo quando ela não for mais necessária e revogá-la no painel se houver qualquer suspeita de exposição.

## Diagnóstico rápido

- `401`: chave inválida, revogada ou copiada incorretamente.
- `403`: projeto sem acesso ao recurso; para imagens, confira a verificação da organização.
- `429`: limite da OpenAI ou limite local de casos por hora.
- caso pronto com SVG: a etapa externa da imagem falhou e o fallback configurado foi usado.
- caso em `failed`: consulte apenas o log do servidor; a API não envia detalhes internos ao navegador.

