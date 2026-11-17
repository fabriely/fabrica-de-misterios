workspace "Fábrica de Mistérios" "Publicação na Vercel com Neon, Blob e Queues; o desenvolvimento local usa Fastify, SQLite e arquivos em disco." {

    model {
        jogador = person "Criador / Jogador" "Configura um mistério sem ver a solução, investiga, acusa e compartilha o caso."

        fabrica = softwareSystem "Fábrica de Mistérios" "Ferramenta de criatividade computacional para criar casos fictícios jogáveis." {
            web = container "Aplicação Web" "Configuração, escolha de premissa, dossiê, investigação e acusação." "React + TypeScript"

            api = container "API de Orquestração" "Coordena a geração, valida casos, protege a solução e avalia acusações." "Funções Node.js + TypeScript" {
                premissas = component "Gerador de premissas" "Combina as escolhas da pessoa para solicitar três premissas curtas sem spoilers." "TypeScript + API de texto"
                instrucoes = component "Montador de instruções" "Une o briefing e a premissa escolhida às instruções versionadas do autor de mistérios: verdade primeiro, cronologia, álibis, pistas e regras de dedução." "TypeScript + templates versionados"
                gerador = component "Gerador de casos" "Solicita um caso estruturado com dossiê público, solução privada e especificação visual da cena." "TypeScript + Structured Outputs"
                validador = component "Validador estrutural" "Confere esquema, IDs, referências, quantidades e evidências decisivas públicas; a coerência narrativa precisa de testes com pessoas." "TypeScript + Zod"
                visual = component "Gerador visual" "Solicita uma cena a partir da especificação aprovada e conserva as pistas verificáveis no dossiê." "TypeScript + API de imagens"
                juizVisual = component "Juiz visual" "Inspeciona a imagem da cena, pede uma correção se houver defeito grave e aprova ou usa imagem reserva." "TypeScript + visão + Structured Outputs"
                qualidade = component "Avaliador narrativo" "Avalia lógica, evidências, justiça, originalidade e solucionabilidade depois que o caso fica pronto." "TypeScript + Structured Outputs"
                metricas = component "Métricas de IA" "Registra duração, tokens, custo estimado e falhas de cada operação." "TypeScript + SQL"
                repositorio = component "Repositório de casos" "Expõe só o dossiê público e mantém solução e acusações por jogador no servidor." "TypeScript + SQL"
                veredito = component "Jurado de acusação" "Pontua a justificativa com base nas provas; o acerto do suspeito é calculado no servidor." "TypeScript + Structured Outputs"
            }

            banco = container "Banco de Dados" "Guarda briefing, premissa, dossiê público, solução privada e acusações separadas por jogador." "Neon PostgreSQL" {
                tags "Database"
            }
            midia = container "Armazenamento de Imagens" "Guarda a cena gerada e devolve uma referência persistente ao caso." "Vercel Blob" {
                tags "Database"
            }
        }

        openai = softwareSystem "OpenAI API" "Serviço externo para gerar texto e imagens e avaliar a cena, o caso e a justificativa."
        fila = softwareSystem "Vercel Queues" "Executa geração e revisões visual e narrativa em quatro etapas assíncronas duráveis."

        jogador -> web "Configura, investiga e acusa" "HTTPS"
        web -> api "Envia briefing e acusação; recebe premissas, dossiê público e veredito" "JSON/HTTPS"
        api -> banco "Lê e grava dados do caso" "PostgreSQL/TCP"
        api -> midia "Grava e lê imagens do caso" "HTTPS"
        api -> openai "Solicita texto estruturado, imagem e revisão visual" "HTTPS"
        api -> fila "Publica etapas de geração" "HTTPS"
        fila -> api "Aciona consumidores privados de texto, imagem e revisão" "HTTPS"

        web -> premissas "Solicita premissas sem spoilers" "JSON/HTTPS"
        web -> instrucoes "Envia briefing e premissa escolhida" "JSON/HTTPS"
        web -> repositorio "Consulta o dossiê pelo ID do caso" "JSON/HTTPS"
        web -> veredito "Envia acusação fundamentada" "JSON/HTTPS"
        web -> metricas "Consulta tempo, custo estimado e qualidade" "JSON/HTTPS"

        premissas -> openai "Gera opções de premissa" "HTTPS"
        instrucoes -> gerador "Envia regras do autor + escolhas da pessoa"
        gerador -> openai "Gera caso em esquema estruturado" "HTTPS"
        gerador -> validador "Entrega caso candidato"
        validador -> repositorio "Aprova e salva dossiê público + solução privada"
        validador -> visual "Envia especificação visual do caso aprovado"
        visual -> openai "Gera imagem da cena" "HTTPS"
        visual -> midia "Armazena imagem" "HTTPS"
        visual -> juizVisual "Entrega a cena candidata"
        juizVisual -> openai "Inspeciona a imagem e devolve parecer estruturado" "HTTPS"
        juizVisual -> visual "Pede nova cena com correções, no máximo uma vez"
        juizVisual -> repositorio "Vincula a cena aprovada ou imagem reserva ao caso"
        juizVisual -> qualidade "Libera a avaliação narrativa após concluir a cena"
        qualidade -> openai "Solicita parecer narrativo estruturado" "HTTPS"
        qualidade -> repositorio "Grava a avaliação do caso"
        metricas -> repositorio "Registra operações e consulta resultados"
        repositorio -> banco "Persiste e consulta o caso" "PostgreSQL/TCP"
        veredito -> openai "Avalia a justificativa sem alterar a solução" "HTTPS"
        veredito -> repositorio "Lê solução privada e registra nota"
    }

    views {
        container fabrica "containers" {
            title "Fábrica de Mistérios — Contêineres (publicação Vercel)"
            include jogador web api banco midia openai fila
            autoLayout lr
        }

        component api "api-components" {
            title "API de Orquestração — Componentes da criação do caso"
            include web premissas instrucoes gerador validador visual juizVisual qualidade metricas repositorio veredito banco midia openai
            autoLayout lr
        }

        styles {
            element "Person" {
                shape Person
                background #123A55
                color #FFFFFF
            }
            element "Software System" {
                background #7E6155
                color #FFFFFF
            }
            element "Container" {
                background #325C61
                color #FFFFFF
            }
            element "Component" {
                background #55777A
                color #FFFFFF
            }
            element "Database" {
                shape Cylinder
                background #626F56
                color #FFFFFF
            }
        }
    }
}
