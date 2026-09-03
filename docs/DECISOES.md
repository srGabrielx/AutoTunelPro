# Decisões técnicas e comentários

## Por que geração procedural primeiro

Hospedar um modelo generativo musical dentro de função serverless gratuita é uma armadilha: cold start, memória, duração máxima e tamanho do bundle matam a experiência. O MVP usa regras musicais determinísticas e roda barato. ML entra depois como serviço assíncrono separado.

## Banco recomendado

Neon Postgres é a opção principal: é relacional, serverless, integra com a Vercel e reduz conexões quando o projeto está ocioso. Supabase é melhor quando autenticação, storage e painel pronto pesarem mais que simplicidade. Turso é uma alternativa SQLite distribuída muito leve.

## Onde um usuário tentará quebrar

- payloads enormes ou repetidos para consumir função;
- valores fora de faixa para travar loops ou áudio;
- abuso da rota sem rate limiting;
- presets injetados como texto arbitrário;
- salvar JSON ou arquivos sem limite de tamanho.

Antes de abrir o produto ao público: imponha limite de corpo, rate limit por IP/usuário, autenticação para persistência e cotas por plano.

## Direitos autorais

Presets devem descrever características musicais gerais. Não treine nem ajuste o motor para copiar uma música, melodia ou produtor específico.
