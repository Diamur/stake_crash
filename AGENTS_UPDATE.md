#### Журнал изменений AGENTS (append-only)
- 2026-03-26: SAFE MODE / MVP для crash.js.
- Добавлены runtime-массивы roundPlayersCountHistory и roundBetSumHistory в MEP.State.
- Добавлен RoundStakeCapture: триггер по тексту "Начинается...", ожидание стабилизации DOM (120мс, 5 стабильных тиков, timeout 5с).
- После фиксации snapshot данные пушатся в массивы (oldest->newest) и логируются в console.
