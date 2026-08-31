---
name: Mobile overlay positioning
description: Why mobile sheets in this app must use portal-based drawers rather than nested fixed panels.
---

Mobile sheets rendered inside session-page scroll containers must use a portal-based drawer. Give the drawer a full safe-viewport internal canvas and use snap points to preserve the intended visible height. Keep the drawer content above its overlay in the z-index stack.

**Why:** iOS Safari and installed web apps can clip or restack fixed descendants of nested touch-scrolling and overflow containers even when desktop mobile emulation looks correct. If the overlay sits above visible drawer content, it intercepts handle gestures and dismisses the drawer instead of allowing snap-point dragging.

**How to apply:** Keep desktop side panels inline, but render mobile/tablet modal surfaces through the shared drawer portal with safe-area spacing, a real touch handle, backdrop dismissal, and an explicit close control. When customizing overlay z-index, assign drawer content a higher z-index and verify upward and downward handle drags.