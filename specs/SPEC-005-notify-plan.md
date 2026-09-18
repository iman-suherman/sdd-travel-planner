# SPEC-005 — Notify the plan

- **Status:** ACTIVE
- **MVP:** yes

## Behaviour

A plan is not done when the option is picked. TripSpec **schedules reminders** from `plan_notifications` only.

1. Trigger: “kunci opsi N”, “yang nomor N dan ingatkan”, or an explicit ask for reminders after a pick.
2. List every item the tool returns: offset, channel (`in-app` in this demo), title.
3. Do not add email, WhatsApp, SMS, or extra alarms.
4. Say what the reminder is for, using the tool `body` — do not rewrite it into a new promise.

## Acceptance

- **Given** “Kunci opsi 2 dan ingatkan aku sebelum berangkat”, **Then** the three in-app reminders from the tool, including **Cek dokumen perjalanan** and **Pengingat berangkat**. *(S5)*

## Non-goals

Real push, email, or calendar sync. The schedule is the contract; delivery in this demo is the in-app list.
