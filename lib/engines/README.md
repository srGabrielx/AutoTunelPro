# Engines

- `melody.ts`: escolhe notas dentro da escala do preset.
- `drums.ts`: constrói padrões de bateria e variações.
- `validate.ts`: trata entradas externas e impõe limites.

Ataque provável: enviar BPM extremo, complexidade negativa, estilo inexistente ou seed inválida. A validação normaliza esses campos antes dos motores.
