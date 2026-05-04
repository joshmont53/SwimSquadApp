# SwimCoach - Session Logging Platform

## Overview
SwimCoach is a professional swimming coaching session logging platform designed for poolside use on tablets and mobile devices. Its primary purpose is to enable coaches to record training sessions, manage competitions, track attendance, manage squads, and analyze performance data. The platform prioritizes efficiency and usability in wet environments through a mobile-first approach with generous touch targets and a clear visual hierarchy. Key capabilities include comprehensive competition management, integrated session and competition calendars, and a robust session library for template management and reuse. The business vision is to provide a reliable, feature-rich tool that enhances coaching effectiveness and streamlines administrative tasks, offering significant market potential in the athletic coaching sector.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend is built with React and TypeScript, using Vite for bundling and Wouter for routing. The UI/UX leverages shadcn/ui (New York style) based on Radix UI primitives, styled with Tailwind CSS and custom HSL-based CSS variables, featuring the Inter font and a mobile-first responsive design. State management is handled by TanStack Query for server state, React Hook Form with Zod for form validation, and React context for authentication.
Core features include:
- **Session & Competition Calendar**: Displays sessions and competitions with distinct visual cues (e.g., diagonal stripes for competitions).
- **Session Detail View**: A three-tab interface for metadata, rich-text content with a distance breakdown sidebar, and attendance. The session content view includes up to four right-edge floating sidebars: distance breakdown, detected drills, session notes, and **Training Notes** (open handbook coach notes for the session's squad(s), shown when relevant notes exist). Includes a **Duplicate Session** feature that allows coaches to copy all session details (content, distances, coaches, location, focus) to different squads. Duplicated sessions are tracked via `duplicatedFromSessionId` and are zero-rated for session writing in the invoice tracker (shown with "Duplicate" badge and £0.00).
- **Competition Management**: Admin-only functionality to create, edit, and delete competitions, including coach assignments with time blocks.
- **Attendance Register**: Manages swimmer attendance with status and notes, enforcing business rules.
- **Session Library**: A template management system allowing coaches to create, edit, store, and reuse session content, integrated with the session editor.
- **Drills Library**: A comprehensive drill management system with stroke-based filtering (Freestyle, Backstroke, Breaststroke, Butterfly, Starts, Turns), real-time search, YouTube video embedding, and full CRUD operations. Features color-coded badges, permission-based edit/delete controls, and responsive card layout.
- **Handbook**: Document management system plus handbook notes, with two tabs:
  - **Documents tab** (DB-backed): Coaches upload, categorize, preview, and download documents (PDF, Word, Excel) stored as base64 in PostgreSQL (`handbook_documents` table). Documents are scoped to a club so all coaches on all devices see the same documents. Features drag-and-drop upload, 6 categories, search/filter, full preview, delete confirmation (soft delete via `record_status`), and download. API endpoints: `GET/POST /api/handbook-documents`, `DELETE /api/handbook-documents/:id`.
  - **Notes tab** (DB-backed): Coaches create, edit, delete, and manage coaching notes (text or checklist type) linked to squads. Notes are stored in PostgreSQL (`coach_notes`, `coach_note_items`, `coach_note_squads` tables). Features: open/closed status toggle, checklist item completion with auto-close when all items done, squad tagging, search/filter, and persistent API-backed state via TanStack Query.
  - Navigation available in both desktop and mobile sidebars under the MY TOOLS section
- **Intelligent Drill Detection**: AI-powered feature that automatically detects drills mentioned in training session content using GPT-4o-mini. Detected drills are displayed in a dedicated sidebar (accessed via Play button) with expandable cards showing full drill details and embedded videos. The drills sidebar button is positioned inside the session content container using absolute positioning (`right-0`), stacked directly below the distance breakdown button when present. Both buttons shift left together when the distance sidebar opens to remain accessible. Includes fallback case-insensitive substring matching for reliability.
- **Squad Grid View**: A new view mode on the Manage Swimmers page (web-only, hidden on mobile). Toggled via "List View" / "Grid View" buttons in the header. Displays swimmers organised in a matrix by squad (rows) × age group columns (8-, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18+). Each cell shows individual swimmer name chips. Age is calculated as at December 31 of the current year. Features: sticky header/count/squad-name columns, drag-and-drop row/column reordering via `react-dnd`, show/hide squads and age groups via popover checkboxes. Component: `client/src/pages/squad-overview-grid.tsx`.
- **Feedback System**: Comprehensive three-part feedback system:
  - **Feedback Form**: Coaches can rate sessions across 6 categories (Engagement, Difficulty, Technique Focus, Energy Levels, Session Flow, Overall Effectiveness) on a 1-5 scale, with optional notes and privacy settings. Accessible via feedback icon on session cards.
  - **Feedback Analytics Dashboard**: Displays aggregated feedback data with trend charts, category breakdowns, stroke/discipline analysis, and AI-powered pattern detection using GPT-4o-mini. Features coach performance comparisons and hidden correlation discovery.
  - **Session Writer Helper**: A slide-out sidebar panel accessible from the session editor (Lightbulb icon) that provides data-driven insights for planning sessions. Features two content layers: (1) Non-AI content showing squad context, recent feedback averages with 2-column grid layout, trend indicators, and highest/lowest category highlights; (2) AI-powered actionable recommendations generated by GPT-4o-mini including "What's Working", "Areas to Address", and focus-specific tips. AI insights are cached per squad/focus combination and persist while the session is being edited, with manual refresh option. Uses smart fallback to all squad data when fewer than 3 focus-specific sessions are available. Requires minimum 3 sessions with feedback to generate AI insights.

### Scheduling, Availability & Cover
A full three-phase scheduling system for managing coach availability, cover requests, and session generation:

- **Phase 1 — Availability & Cover page** (`client/src/pages/availability-cover.tsx`): Three-tab interface for all coaches.
  - *Availability tab*: Log absence periods (date range, type, optional reason) and view upcoming absences. Delete absences. API: `GET/POST/DELETE /api/absence-periods`.
  - *My Cover tab*: Request cover for specific sessions, view personal cover requests and their status (open/filled/cancelled). API: `GET/POST /api/cover-opportunities`.
  - *Opportunities tab*: Browse open cover requests from other coaches, volunteer to cover, filtered by qualification level (Level 2+ required for L2/L3 sessions). API: `PATCH /api/cover-opportunities/:id/volunteer`.
- **Phase 2 & 3 — Schedule Manager** (`client/src/pages/schedule-manager.tsx`): Admin-only three-tab interface.
  - *Standard Schedule tab*: Create and manage recurring session templates (day of week, time, location, squads, level required). Full CRUD. API: `GET/POST/PATCH/DELETE /api/recurring-sessions`.
  - *Generate Sessions tab*: Select a date range and generate individual swimming sessions from the recurring schedule. Shows a draft table with inline editing of coach assignments (with qualification filtering), absence conflict warnings, and bulk confirm. Uses float sessions for unmatched slots. API: `POST /api/float-sessions`.
  - *Alerts tab*: Shows sessions needing cover based on logged absences — highlights sessions where the assigned coach is absent with the ability to open cover requests directly.
- **New DB tables**: `recurring_sessions`, `recurring_session_squads`, `absence_periods`, `cover_opportunities`, `float_sessions` (all in `shared/schema.ts`).
- **New storage methods**: Full CRUD for all 5 tables in `server/storage.ts`.
- **New API routes**: All scheduling/availability routes in `server/routes.ts`.
- **Sidebar navigation**: "Availability & Cover" under MY TOOLS section (all roles); "Schedule Manager" under new Scheduling section (admin only). Located in `client/src/components/CollapsibleSidebar.tsx`.

### Backend
The backend uses Node.js with Express.js and TypeScript, providing a RESTful API with JSON responses. Drizzle ORM is used for type-safe PostgreSQL operations, abstracted via a storage interface. AI integration is provided by GPT-4o-mini via Replit AI for automated distance extraction, intelligent drill detection, feedback analytics insights, and session planning recommendations, with rule-based parser fallbacks for reliability. Session management uses Express sessions with a PostgreSQL store and secure HTTP-only cookies. Authentication is admin-controlled Email/Password based, featuring bcrypt hashing, crypto-secure tokens, Resend email integration, and role-based access control. A soft delete system (`record_status`) is implemented across core entities for data preservation.

### Database
The system utilizes a PostgreSQL database hosted on Neon Serverless, with Drizzle ORM for type-safe interactions. The schema includes core entities such as `users`, `coaches`, `squads`, `swimmers`, `locations`, `swimming_sessions`, `session_squads`, `attendance`, `competitions`, `competition_coaching`, `session_templates`, and `drills`. Relationships are comprehensive, linking various entities. The data model uses UUID primary keys, timestamp tracking, detailed stroke/distance tracking, template content storage (both plain text and rich HTML), drill metadata (name, stroke type, description, video URL), and AI-detected drill associations (`detected_drill_ids` array in sessions). Soft deletes are implemented using a `record_status` column across all core entities. Session duplication is tracked via `duplicated_from_session_id` (nullable varchar) on `swimming_sessions`, linking duplicated sessions to their source for audit trail and invoice zero-rating.
- **Multi-Squad Sessions (Phase 5 Complete)**: The `session_squads` junction table enables many-to-many relationships between sessions and squads. The existing `swimming_sessions.squadId` column is preserved as the primary squad for backward compatibility. The `session_squads` table has a unique constraint on (session_id, squad_id) and uses `record_status` for soft deletes (audit trail). All 6 phases are complete: Phase 1 (database table), Phase 2 (session creation UI + attendance with squad subheadings), Phase 3 (calendar display with gradient backgrounds), Phase 4 (edit session with multi-squad selector), Phase 5 (analytics - all 5 feedback/analytics endpoints and 2 AI assistant endpoints updated to use session_squads junction table), Phase 6 (invoice - squad names resolved via session_squads for coaching sessions and sessions written).

### Authentication & Authorization
The authentication system is a production-ready, standalone Email/Password authentication with an admin-controlled invitation flow, eliminating external OAuth dependencies. It features a single-email invitation process where the token proves email ownership. Key security features include bcrypt hashing, crypto-secure tokens, atomic database transactions, and role-based access control with `requireAdmin` middleware. The system supports a robust invitation flow from admin creation to coach registration and login, with comprehensive error handling and recovery mechanisms.

## Stripe Billing (SaaS Subscription)
The platform uses Stripe for club subscription billing. Key components:
- **Registration flow**: `POST /api/register/checkout` creates a Stripe Checkout session and a `pending_registrations` record. Webhook `checkout.session.completed` finalises registration (creates club, admin user, coach record).
- **Pricing**: Graduated GBP tiers — £20/user for 1–5, £15 for 6–10, £10 for 11+; monthly recurring. Product ID: `prod_UFGxJEbEgEpM7P`; price ID: `price_1TGmPvD28dJq0fFqF8LLozlx`.
- **Subscription quantity sync**: `syncSubscriptionQuantity()` in `server/stripeClient.ts` updates the Stripe subscription item quantity whenever active users change (deactivate/reactivate coach). Non-fatal; logs errors and swallows them.
- **Billing admin UI**: Admin-only "Billing" page (`BillingView` in `App.tsx`) shows subscription status, active user count, billed quantity, and pricing tiers. Includes a "Manage billing in Stripe" button that opens the Stripe Customer Portal.
- **Stripe Customer Portal**: `POST /api/billing/portal` creates a portal session for the club's Stripe customer. Return URL is `/app`.
- **Cancel Club**: `POST /api/clubs/:id/cancel` (admin only) cancels the Stripe subscription and marks all club data (coaches, users, swimmers, squads, sessions, locations) as inactive. Available in Club Settings with a confirmation dialog.
- **Webhooks**: Raw body required before `express.json()` middleware. Configured via `STRIPE_WEBHOOK_SECRET` env var.
- **Env vars**: `STRIPE_SUBSCRIPTION_PRICE_ID`, `STRIPE_PRODUCT_ID`, `APP_BASE_URL`, `STRIPE_WEBHOOK_SECRET`.
- **Schema**: `clubs` table has `stripe_customer_id`, `stripe_subscription_id`, `active_users` columns.
- **`pending_registrations` table**: Stores Stripe checkout session ID + registration data before webhook confirmation.

## Native App Platform Restrictions (Apple App Store / Google Play Compliance)

To comply with Apple guideline 3.1.3(b), the following payment-related features are automatically hidden when the app is running inside the iOS or Android native WebView wrapper:

- **Register Club link** on the login page (leads to Stripe checkout)
- **`/register-club` route** — redirects native users to `/login`
- **`/billing` route** — redirects native users to `/app`
- **Billing sidebar item** in `CollapsibleSidebar`
- **BillingView panel** inside the app's management area
- **Cancel Club section** in Club Settings

### Detection mechanism
`client/src/hooks/use-native-app.ts` — the single source of truth. Returns `true` when:
1. `window.isNativeApp === true` (injected by Swift via `evaluateJavaScript` in `webView(_:didFinish:)`)
2. URL contains `?native=true` (browser-based testing convenience)

Web users are completely unaffected — all features remain fully visible and functional.

### Swift wrapper change required
In `WebViewCoordinator.webView(_:didFinish:)`, add as the **first** `evaluateJavaScript` call:
```swift
webView.evaluateJavaScript("window.isNativeApp = true;") { _, _ in }
```
The updated Swift file is saved at `attached_assets/SwiftNativeWrapper_Updated.swift`.
Note: The `appURL` in `ContentView` has been updated from the old `.replit.app` domain to `https://swimsquadapp.co.uk`.

## External Dependencies

### Third-Party Services
-   **Database Hosting**: Neon Serverless PostgreSQL
-   **Font Delivery**: Google Fonts CDN
-   **AI Integration**: Replit AI (GPT-4o-mini)
-   **Email Service**: Resend API
-   **Payments & Billing**: Stripe (subscriptions, Customer Portal, webhooks)

### Key NPM Packages
-   **Frontend**: `react`, `react-dom`, `wouter`, `@tanstack/react-query`, `react-hook-form`, `zod`, `@radix-ui/*`, `tailwindcss`, `class-variance-authority`, `lucide-react`, `react-dnd`, `react-dnd-html5-backend`.
-   **Backend**: `express`, `drizzle-orm`, `@neondatabase/serverless`, `express-session`, `connect-pg-simple`, `bcrypt`.