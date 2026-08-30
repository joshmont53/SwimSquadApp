---
name: Season Planner snapshot contract
description: Durable planning-data and session-matching rules for future Season Planner changes.
---

Season plans are independent planning snapshots. Creating or editing them must never create or modify real swimming sessions. Competition details annotate matching training rows, and overlapping plans resolve to the newest active plan per squad.

**Why:** The planner is meant to preserve the Standard Schedule as it existed when planning began while keeping the operational calendar independent.

**How to apply:** Match session-detail data using club, linked squad, canonical database date, and exact start/end times. Multi-squad slots use the existing junction tables. Do not make planner JSON depend on real session IDs.