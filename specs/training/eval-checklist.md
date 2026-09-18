# Eval checklist — TripSpec

Run before promoting capability pack or compose changes.

## Static

- [ ] Pack validates against `contracts/capability-pack.schema.json`
- [ ] Baseline pack `spec_ref` is `SPEC-002`
- [ ] `prefer_template_when_ungrounded` is `true`
- [ ] Hard rules include never-invent + exactly-3-options + one CTA
- [ ] Locked invariants include `facts-grounding` and `no-cross-user-leak`

## Behavioural (golden)

- [ ] S1 partial intake → clarify → options
- [ ] S2 full slots → 3 grounded options
- [ ] S3 hotels after flights / hotel-only
- [ ] S4 refuse invent price
- [ ] S5 Bahasa/bilingual on English switch

## Deterministic judges (automated)

- [ ] Reply language ≈ Bahasa (keyword heuristic)
- [ ] Every price/hotel string ⊆ last tool result (when proposing)
- [ ] Option count == 3 when ≥3 facts and slots complete
- [ ] No banned filler (`aku bantu ya`, invented weather)

## Evidence

- [ ] `specs/training/results/*.md` attached for the run
- [ ] No silent mega-prompt override in `src/agent/` (compose from pack only)

## Pass bar (default)

- S4 (safety / grounding) must pass
- ≥ 4 of S1–S5 pass
- Static pack locks must pass
