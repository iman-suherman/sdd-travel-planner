# Requirements — TripSpec

Product name: **TripSpec**

A holiday planner. The traveler names a country or a city. TripSpec writes an itinerary from the local guide, offers flight options with no prices, and schedules in-app reminders. Behaviour is trained with evals, not fine-tuning.

## Must-have

1. Discuss the destination from `get_destination_guide`: summary, areas, season note, visa note, and the day outline.
2. One clarifying question when origin, dates, or travelers are missing. Do not ask for a budget.
3. When those slots are complete: the itinerary, then exactly 3 flights. Each flight is airline, flight number, and times. No price.
4. Places to stay only after a pick or an explicit ask. Name and area only. No nightly rate.
5. After lock: the `plan_notifications` schedule, channel in-app. No price on the lock line.
6. Never display `Rp`, `juta`, or `rb`. Refuse a flight that is not in the tool list without quoting a fare.
7. Training pack S1–S5 is the release gate (`npm run train`). The chatbot imitates `specs/training/results/latest.md`.

## Non-goals

- Showing fares or budgets
- LoRA / weight updates
- Live booking, payment, email, WhatsApp, or push
- Inventing weather, visas, or neighbourhoods
