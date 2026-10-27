workspace "Fábrica de Mistérios" "Arquitetura proposta para gerar e jogar casos investigativos com IA; o repositório atual contém apenas o protótipo web." {

    model {
        jogador = person "Criador / Jogador" "Configura um mistério sem ver a solução, investiga, acusa e compartilha o caso."

        fabrica = softwareSystem "Fábrica de Mistérios" "Ferramenta de criatividade computacional para criar casos fictícios jogáveis." {
            web = container "Aplicação Web" "Configuração, escolha de premissa, dossiê, investigação e acusação." "React + TypeScript"

            api = container "API de Orquestração" "Coordena a geração, valida casos, protege a solução e avalia acusações." "Vercel Functions / Node.js + TypeScript" {
                premissas = component "Gerador de premissas" "Combina o cenário e os personagens para solicitar três premissas curtas sem spoilers." "TypeScript + API de texto"
                instrucoes = component "Montador de instruções" "Une o briefing e a premissa escolhida às instruções versionadas do autor de mistérios: verdade primeiro, cronologia, álibis, pistas e regras de dedução." "TypeScript + templates versionados"
                gerador = component "Gerador de casos" "Solicita um caso estruturado com dossiê público, solução privada e especificação visual da cena." "TypeScript + Structured Outputs"
                validador = component "Validador narrativo" "Confere esquema, IDs, cronologia, coerência das pistas, ausência de spoilers e se a solução usa somente fatos acessíveis." "TypeScript"
                visual = component "Gerador visual" "Solicita uma cena a partir da especificação aprovada e conserva as pistas verificáveis no dossiê." "TypeScript + API de imagens"
                repositorio = component "Repositório de casos" "Salva o caso uma vez, expõe apenas o dossiê público e mantém a solução privada ligada ao mesmo ID." "TypeScript + Prisma"
                veredito = component "Avaliador de acusação" "Compara suspeito e evidências com a solução privada e só então devolve a explicação." "TypeScript"
            }

            banco = container "Banco de Dados" "Guarda briefing, premissa, dossiê público, solução privada e versões das instruções/modelos." "PostgreSQL via Vercel Marketplace" {
                tags "Database"
            }
            midia = container "Armazenamento de Imagens" "Guarda a cena gerada e devolve uma referência persistente ao caso." "Vercel Blob ou equivalente" {
                tags "Database"
            }
        }

        openai = softwareSystem "OpenAI API" "Serviço externo para geração estruturada de texto e geração de imagens."

        jogador -> web "Configura, investiga e acusa" "HTTPS"
        web -> api "Envia briefing e acusação; recebe premissas, dossiê público e veredito" "JSON/HTTPS"
        api -> banco "Lê e grava dados do caso" "PostgreSQL/TCP"
        api -> midia "Grava e lê imagens do caso" "HTTPS"
        api -> openai "Solicita texto estruturado e imagem" "HTTPS"

        web -> premissas "Solicita premissas sem spoilers" "JSON/HTTPS"
        web -> instrucoes "Envia briefing e premissa escolhida" "JSON/HTTPS"
        web -> repositorio "Consulta o dossiê pelo ID do caso" "JSON/HTTPS"
        web -> veredito "Envia acusação" "JSON/HTTPS"

        premissas -> openai "Gera opções de premissa" "HTTPS"
        instrucoes -> gerador "Envia regras do autor + escolhas da pessoa"
        gerador -> openai "Gera caso em esquema estruturado" "HTTPS"
        gerador -> validador "Entrega caso candidato"
        validador -> repositorio "Aprova e salva dossiê público + solução privada"
        validador -> visual "Envia especificação visual do caso aprovado"
        visual -> openai "Gera imagem da cena" "HTTPS"
        visual -> midia "Armazena imagem" "HTTPS"
        visual -> repositorio "Vincula imagem ao caso"
        repositorio -> banco "Persiste e consulta o caso" "PostgreSQL/TCP"
        veredito -> repositorio "Lê solução privada e registra veredito"
    }

    views {
        container fabrica "containers" {
            title "Fábrica de Mistérios — Contêineres (arquitetura proposta)"
            include jogador web api banco midia openai
            autoLayout lr
        }

        component api "api-components" {
            title "API de Orquestração — Componentes da criação do caso"
            include web premissas instrucoes gerador validador visual repositorio veredito banco midia openai
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
