# Requirements — TripSpec

Product name: **TripSpec**

A holiday planner. The traveler names a country or a city. TripSpec writes an itinerary from the local guide, offers flight options with no prices, and schedules in-app reminders. Behaviour is trained with evals, not fine-tuning.

## Must-have

1. On the turn a country or city is named, discuss it from `get_destination_guide`: summary, areas, season note, visa note, and the day outline. Do not repeat that on the next turn.
2. One clarifying question when origin, dates, or travelers are missing. Do not ask for a budget. Ask each missing slot once.
3. Later turns continue. Do not repeat the guide, the day plan, or a flight list already in the thread. `besok`, `lusa`, and `hari ini` are dates. When those slots are complete: exactly 3 flights. Each flight is airline, flight number, and times. No price.
4. Places to stay only after a pick or an explicit ask. Name and area only. No nightly rate.
5. After lock: the `plan_notifications` schedule, channel in-app. No price on the lock line.
6. Never display `Rp`, `juta`, or `rb`. Refuse a flight that is not in the tool list without quoting a fare.
7. Training pack S1–S6 is the release gate (`npm run train`). S6 is the continuation turn. The chatbot imitates `specs/training/results/latest.md` for the turn that matches, and does not paste an earlier PASS reply again.

## Non-goals

- Showing fares or budgets
- LoRA / weight updates
- Live booking, payment, email, WhatsApp, or push
- Inventing weather, visas, or neighbourhoods
