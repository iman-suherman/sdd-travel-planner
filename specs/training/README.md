# Training pack — TripSpec planner

```bash
npm run train:aor      # AOR drafts only
npm run train          # S1 discuss → S5 notify
npm run eval:mock
```

| ID | Proves |
| --- | --- |
| S1 | Country discussed from the guide, one missing slot |
| S2 | Day plan + 3 grounded flights |
| S3 | Hotels after the pick |
| S4 | Refuse a fare that is not in inventory |
| S5 | In-app reminder schedule, nothing else |

Details: [`HOWTO-TRAINING.md`](./HOWTO-TRAINING.md) and [`../../docs/training-execution.md`](../../docs/training-execution.md).
