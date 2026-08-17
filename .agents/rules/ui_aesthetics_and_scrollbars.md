---
name: ui_aesthetics_and_scrollbars
description: Regras obrigatórias para barras de rolagem e simplicidade de cards no AutoTunel.
---

# UI Aesthetics & Scrollbars
1. **Barras de Rolagem Horizontais:** SEMPRE esconda barras de rolagem nativas em listas horizontais (como abas e carrosséis) usando `::-webkit-scrollbar { display: none; }` e `-ms-overflow-style: none; scrollbar-width: none;`.
2. **Prevenção de Esmagamento:** Itens dentro de listas horizontais com scroll DEVEM ter `flex-shrink: 0` e `white-space: nowrap` para nunca serem "amassados" pela barra ou bordas.
3. **Cards de Usuário Simples:** Ao criar listagens de itens salvos pelo usuário (ex: Presets Personalizados), mantenha a interface limpa. Mostre apenas o Nome (com `word-break: break-word` para quebras corretas) e ações essenciais. Não adicione descrições falsas ou tags poluídas.
