# Preservação de Arquitetura de Layout e CSS

1. **Nunca Reorganizar Arquivos CSS em Massa**: Para corrigir falhas de sintaxe em CSS volumosos (como `globals.css`), **NUNCA** mova blocos inteiros, nem reordene classes, variáveis ou `@media queries`. A estrutura original (tokens no topo, resets, utilitários base e componentes específicos) deve ser preservada rigorosamente para não quebrar a arquitetura visual.
2. **Correção Cirúrgica**: Qualquer erro (*duplicate closing brace*, caracteres invisíveis ou falha no PostCSS) deve ser investigado e corrigido *exatamente na linha* em que ocorreu.
3. **Respeitar o Layout Base**: O aspecto visual da tela construído até o commit `e8b4293` é a fonte de verdade (fundo correto e disposição dos cards de preset). Ao estender o layout, não subverta a árvore DOM. Anexe novos modais ou `overlays` sem mexer no que já está funcionando.
4. **Contenção Estrita de Texto em Botões e Cards**:
   - Todo botão de seleção ou trigger (`.artist-select`, `.param-select`) que exiba textos dinâmicos longos deve possuir `overflow: hidden`, `text-overflow: ellipsis`, `white-space: nowrap` e `width: 100%` para garantir que o texto nunca ultrapasse as bordas.
   - Títulos de cards e tags em modais (`.preset-card-title`, `.preset-card-desc`) devem ter `word-break: break-word` e `overflow-wrap: break-word` para evitar quebra de layout e transbordo em resoluções menores.
