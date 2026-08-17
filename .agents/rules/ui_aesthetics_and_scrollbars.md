---
name: ui_aesthetics_and_scrollbars
description: Regras obrigatórias para barras de rolagem e simplicidade de cards no AutoTunel.
---

# UI Aesthetics & Scrollbars
1. **Barras de Rolagem Horizontais:** SEMPRE esconda barras de rolagem nativas em listas horizontais (como abas e carrosséis) usando `::-webkit-scrollbar { display: none; }` e `-ms-overflow-style: none; scrollbar-width: none;`.
2. **Prevenção de Esmagamento:** Itens dentro de listas horizontais com scroll DEVEM ter `flex-shrink: 0` e `white-space: nowrap` para nunca serem "amassados" pela barra ou bordas.
3. **Cards de Usuário Simples:** Ao criar listagens de itens salvos pelo usuário (ex: Presets Personalizados), mantenha a interface limpa. Mostre apenas o Nome (com `word-break: break-word` para quebras corretas) e ações essenciais. Não adicione descrições falsas ou tags poluídas.
4. **Cores de Fundo Consistentes:** Barras horizontais de navegação (como a `.preset-tabs`) devem compartilhar a mesma cor de fundo translúcida (`rgba(12, 12, 16, 0.98)`) utilizada nos menus (como o `.add-track-menu`), para manter a unidade estética e a sensação "premium" do design.
