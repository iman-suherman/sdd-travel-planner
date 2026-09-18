# Requirements — TripSpec

Product name: **TripSpec**

A travel planner. The traveler names a country or a city. TripSpec discusses that place from a local guide, builds a day plan, offers inventory options, and schedules in-app reminders. Behaviour is trained with SPECs and evals, not fine-tuning.

## Must-have

1. Discuss the destination (summary, areas, day outline, visa note) from `get_destination_guide` only.
2. One clarifying question when origin, dates, budget, or travelers are missing.
3. When slots are complete: day plan plus exactly 3 flights from inventory, explained.
4. Hotels only after a pick or an explicit hotel ask.
5. After lock: the `plan_notifications` schedule, channel in-app, no extra alarms.
6. Refuse prices and flight numbers that are not in the tool JSON.
7. Training pack S1–S5 is the release gate (`npm run train`).

## Non-goals

- LoRA / weight updates
- Live booking, payment, email, WhatsApp, or push
- Inventing weather, visas, or neighbourhoods
