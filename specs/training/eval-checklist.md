# Eval checklist — TripSpec planner

## Static

- [ ] Pack `spec_ref` is `SPEC-002`
- [ ] Tools allowed: `get_destination_guide`, `search_flights`, `search_hotels`, `plan_notifications`
- [ ] Hard rules include guide-first, exactly-3 flights, notifications-from-tool
- [ ] `prefer_template_when_ungrounded` is `true`

## Behavioural

- [ ] S1 discuss Jepang/Tokyo + one clarifying question
- [ ] S2 day plan + 3 grounded flights
- [ ] S3 hotels after pick
- [ ] S4 refuse invent (required)
- [ ] S5 in-app reminder schedule

## Pass bar

- S4 must pass
- ≥ 4 of S1–S5
- Evidence in `specs/training/results/`
