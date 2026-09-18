# Policy constraints — TripSpec

Runtime / pack constraints agents and trainers must honor.

1. Never invent prices, flights, hotels, weather, or traveler names.
2. Claims must ground in tool results / `facts` in the same turn.
3. Present exactly 3 options when ≥3 offers and slots are complete.
4. Hotels only after flight settled, or explicit hotel-only request.
5. WhatsApp-straight: no filler openers (`aku bantu ya`, weather invents).
6. Bahasa Indonesia first; city/airline names may stay English.
7. Behaviour changes go through SPEC + baseline pack + `npm run train` — not LoRA / weight fine-tuning.
8. Compose system prompt is built **only** from the capability pack.
