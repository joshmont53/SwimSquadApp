---
name: Development schema merges
description: Constraint for safely applying additive schema changes after task merges.
---

Generic Drizzle schema push can surface unrelated existing schema drift and prompt for destructive choices. Post-merge setup runs with stdin closed, so do not depend on an interactive push.

**Why:** An additive squad-column change exposed an unrelated uniqueness prompt; the generic command exited without providing a reliable merge migration path.

**How to apply:** For additive development schema changes, prefer a committed idempotent migration and a targeted non-interactive post-merge runner. Leave production application to Replit Publish's schema-diff flow.