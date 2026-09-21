# Repository Review

**Audience:** data-oriented owner. **Mode:** read-only review; no cleanup was performed.

## Executive summary

This is a TypeScript/React web application for swimming-club session logging and administration. The likely current runtime source is client/src, server, shared, migrations, scripts and root configuration. Timestamped files under attached_assets are uploaded references/source snapshots, not runtime source. The browser is built by Vite and served alongside a Node.js/Express API. Drizzle maps shared TypeScript schema definitions to PostgreSQL via Neon serverless. Authentication is invitation-based email/password with bcrypt, sessions and role checks. Stripe handles club subscriptions, Resend sends email, OpenAI/Replit AI supports coaching analysis, and APNs-related code supports iOS push notifications.

There are **645 tracked paths**: 441 attached_assets, 122 client, 22 server, 22 migrations, 18 root, 6 scripts, 6 .agents, 4 shared, 2 reports and 2 privacy_documents. These counts come from git ls-files, the authoritative review scope. No Python or Java application source was found. .replit enables a Python 3.11 runtime module, but that is Replit environment support—not evidence that the app uses Python; application scripts and source are Node.js/TypeScript/React. No Java application source was found either.

## Glossary

| Term | Plain-English meaning |
|---|---|
| API/REST | HTTP endpoints the browser calls to read or change data. |
| React component | Reusable screen behavior and markup. |
| Query/cache | TanStack Query browser memory for server responses. |
| Middleware | Server functions for parsing, sessions and authorization. |
| ORM/Drizzle | Typed database layer that generates SQL. |
| Migration | Ordered database change. |
| Soft delete | Mark inactive rather than physically deleting. |
| Webhook | Signed request from Stripe about a billing event. |
| APNs | Apple Push Notification service. |

## Technology stack

* **Languages:** TypeScript/TSX dominate; JavaScript config, CSS, SQL, Markdown, JSON/TOML/Shell and Swift also occur. There is no Python or Java application source.
* **Frontend:** React 18, Vite, Wouter, TanStack Query, React Hook Form/Zod, Radix, Tailwind, Lucide, Recharts and drag/drop libraries.
* **Backend:** Node.js 20, Express 4, TypeScript, JSON REST, sessions, bcrypt and crypto/JWT utilities.
* **Data:** Neon serverless PostgreSQL, Drizzle ORM/Kit and Zod; shared/schema.ts is the central contract.
* **Integrations:** Stripe subscriptions/customer portal/webhooks; Resend email; OpenAI/Replit AI; APNs; optional video URLs/CDN assets.
* **Build/deploy:** npm run build runs Vite and esbuild; npm run start runs the bundle. Replit autoscale uses port 5000 internally/80 externally.

## Architecture and request flow

client/src/main.tsx mounts App. App provides QueryClient, auth-aware navigation and page/component composition. Pages and components call client/src/lib/queryClient.ts, which uses fetch with credentials and cache behavior. A browser action reaches an Express endpoint registered in server/routes.ts. Auth middleware from server/newAuth.ts and Zod schemas from shared/schema.ts apply before route logic. Routes call server/storage.ts; DatabaseStorage uses server/db.ts and Drizzle against shared/schema.ts, which sends SQL through Neon to PostgreSQL. JSON returns to the browser and mutations invalidate/refetch Query keys.

server/index.ts creates Express, registers the raw-body Stripe webhook before JSON parsing, performs startup checks/repairs, registers routes, then serves Vite in development or dist in production. Stripe webhooks are signature-verified; Resend handles invitation/password emails; AI parser/assistant code calls OpenAI/Replit AI; notification code stores device tokens and schedules APNs work.

**Key relationships:** main → App → pages/components is the browser hierarchy. App/queryClient → Express routes is the request boundary. routes → storage → Drizzle schema/db → PostgreSQL is the durable data path. Stripe reports billing and webhooks, Resend delivers email, OpenAI/Replit AI analyzes coaching text, and APNs delivers native push; these services complement rather than replace PostgreSQL.

## Frontend, backend, database and authentication

Frontend features include calendars, sessions, attendance, squads/swimmers/coaches/locations, competitions, drills, templates, handbook, feedback/analytics, scheduling, availability/cover, season planning and billing. The App includes native detection and an iOS device-token bridge. React Query has no automatic retries and long stale time, so mutations must invalidate affected keys.

The REST backend validates input, checks club ownership/admin privileges and delegates to storage. Storage covers clubs, users, coaches, squads, swimmers, locations, sessions, attendance, invitations, feedback, drills, notes, recurring sessions, cover and season plans. Soft-delete/status fields preserve history and club_id is the tenant boundary.

Authentication is invitation-controlled email/password: bcrypt hashes passwords; verification/reset tokens expire; Express sessions use PostgreSQL storage; requireAuth and requireAdmin protect routes. Legacy Replit-auth compatibility remains visible in comments/types. Owners should validate cookie/session secrets, token expiry, invitation sanitization and cross-club authorization in deployment.

## Database, build, deploy and validation

shared/schema.ts defines tables, relations and inferred types/Zod insert schemas, including clubs, users, coaches, squads, swimmers, locations, sessions, session_squads, attendance, competitions, competition_coaching, rates, templates, drills, feedback, handbook, recurring sessions, season plans, absence/cover/float and notification/device records. drizzle.config.ts points Drizzle Kit at PostgreSQL, the schema and migrations. Startup also has idempotent initialization/repair logic, which should be controlled in production.

package.json exposes npm run dev, build, start, check and db:push. npm run check is strict TypeScript with no emit; tsconfig excludes **/*.test.ts, so tests are not part of normal type checking. Tracked tests cover season planning, session squads and time estimation. There is no general test script. Validation should include type-check, production build, migration backup discipline, API smoke tests, Stripe signature tests, email/AI failure handling, club isolation and mobile/native restrictions. This report did not run or modify the app.

## Tracked versus non-runtime material

| Class | Treatment |
|---|---|
| First-party source/config/docs | client/src, server, shared, migrations, scripts, root config and privacy docs; maintain under review. |
| Generated output/dependencies | package-lock.json is resolved dependency state, not first-party code; dist and node_modules are ignored locally; reports are outputs. |
| Uploaded references | attached_assets contains historical snapshots, requirements, screenshots and media; timestamped snapshots are not runtime source. |
| Replit metadata | .replit, .agents and memory describe hosting/workflow/agent context. |
| Local-only ignored folders | node_modules, dist, server/public, .DS_Store, vite config variants and tarballs per .gitignore. |

## Operational and security risks (evidence-based)

These are review findings from the named tracked files. The report does not open or expose any sensitive asset contents.

* **Production-capable session-secret fallback — server/newAuth.ts:41-52.** Express sessions use process.env.SESSION_SECRET, but fall back to a predictable development string when the variable is absent. In production, a missing secret can allow attackers who know the fallback to forge or invalidate session cookies. Require a strong deployment secret and fail startup when production configuration is missing; keep development behavior explicitly isolated.
* **APNs key/diagnostic exposure — server/notifications/apnsService.ts:57-87 and 119-165, 200-212.** The service reads APNS_PRIVATE_KEY, reformats it, and logs the first 50 characters when PEM validation fails; connection and APNs response errors are also logged, and reminder logs include coach names/messages. The tracked filename attached_assets/AuthKey_L92UYWKD84_1768660547189.p8 was not opened. Redact key material and sensitive diagnostics, constrain logs and rotate/revoke the key if security review finds it was exposed.
* **Hardcoded single-club/startup mutation and Stripe coupling — server/index.ts:172-343, 345-391.** Startup can create Hart Swimming Club when no clubs exist, uses fixed seed/linking assumptions, updates many tables to one club, repairs missing club IDs, and can create/repair Stripe customer/subscription records. These actions mutate production data and couple boot success to a particular club and billing state. Gate one-time seeding behind an explicit migration/administrative operation, make repairs tenant-aware and auditable, and require a dry-run/backup before deployment.
* **Tenant-boundary test gap — server/routes.ts, server/storage.ts, server/*.test.ts.** Routes and storage commonly use clubId checks, but the tracked tests are focused on season planning/session squads/time estimation and do not demonstrate comprehensive cross-club authorization coverage. Add tests that attempt every sensitive read/write with another club's IDs, including nested session, attendance, invitation, billing, notes and planning resources.
* **Split migration history — migrations/*.sql versus migrations/meta/_journal.json.** The journal records tags through 0008_season_planner, while tracked SQL also includes 0001_add_record_status.sql, 0006_add_club_color.sql, 0009_add_squad_average_50m_seconds.sql and 0010_deduplicate_active_attendance.sql (and the journal does not list the separately named 0001/0006 files). This may reflect squashed/renamed or manually added changes. Do not delete or regenerate snapshots; reconcile the discrepancy with a reviewed deployment procedure that identifies what has run in each database.

## Prioritised cleanup assessment (recommendations only)

**Urgent sensitive-artifact investigation comes before normal housekeeping.** No cleanup was performed. Recommendations require owner approval, backups and secret-handling controls.

| Priority/category | Concrete candidate paths/groups | Reason | Risk/caution | Suggested sequence |
|---|---|---|---|---|
| 0 — investigate | attached_assets/AuthKey_L92UYWKD84_1768660547189.p8; any filename resembling private key, token, certificate or credential | A .p8 AuthKey filename may identify an Apple signing key. Contents were not inspected or exposed. | Treat as potentially compromised; do not open casually. Rotation/revocation can disrupt push delivery. | First inventory with approved secret-scanning process; ask owner whether it is real; revoke/rotate and move to secret storage before any archive/removal. |
| 1 — retain | client/src, server, shared, migrations, scripts, package.json, vite.config.ts, drizzle.config.ts, tsconfig.json and maintained tests | These are likely current runtime source, schema, deployment/build configuration and safeguards. | Migration order and schema compatibility are production-critical; tests are excluded from normal tsconfig checking. | Keep under review; run checks/build and back up database before structural changes. |
| 2 — reorganise | attached_assets/* timestamped source snapshots; root requirement/design notes; .agents/* | Historical snapshots and agent notes are valuable context but obscure active source and may duplicate one another. | Moving/renaming can break provenance or links; confirm retention/legal needs. | Inventory references, label provenance, then move to an explicit archive/reference location or external store with an index. |
| 3 — archive | Superseded attached_assets/*.tsx, *.css, screenshots, DOCX requirement exports and old design snapshots | Reduces confusion while preserving historical decisions and rollback evidence. | Do not archive the sensitive-looking key until security review; do not discard legal/audit records. | Owner sign-off, checksum/index, then read-only archive with retention date. |
| 4 — retain/reconcile | migrations/meta/* and migrations/meta/_journal.json; reports/*.csv and package-lock.json handled separately | Migration snapshots and the journal are committed migration history and must be preserved. Reports/lockfile are generated or resolved artifacts, but still support audit/reproducibility. | Editing migration history or regenerating it can make deployed databases ambiguous; unjournaled SQL must not be silently applied. | Preserve migration metadata. Reconcile SQL files absent from the journal through an explicit reviewed deployment procedure, with database backup, ordered verification and owner sign-off. Regenerate reports/lockfile only through their owning process when intentionally updating them. |
| 5 — add to .gitignore | Private-key exports, local caches, generated archives/reports and any new build output; review .gitignore | Prevents accidental future credential/build artifact commits. | Over-broad patterns can hide migrations, legal docs or useful audit evidence. | Add narrow patterns after confirming required tracked paths; verify git ls-files remains complete for intended scope. |
| 6 — likely remove | Duplicate/superseded snapshots or media proven to have no legal, audit, rollback, product or design-history value | Removes noise and storage cost. | Filename alone cannot prove obsolescence; deletion is irreversible without archive. | Archive/index first, obtain owner approval, then remove only confirmed duplicates. |

## Typical user-action walkthrough

Example: an admin changes the club colour. The admin opens the Club Settings view in App, which renders the settings component/page. Clicking Save calls apiRequest in client/src/lib/queryClient.ts with PATCH /api/club/settings and the browser session cookie. Express receives the request in server/routes.ts; requireAuth and requireAdmin identify the user and protect the club boundary, while the route validates the hex colour. The route calls storage.updateClub in server/storage.ts. DatabaseStorage uses the Drizzle db client from server/db.ts, whose Neon connection sends an UPDATE to PostgreSQL using the clubs definition in shared/schema.ts. PostgreSQL returns the updated club record; storage and the route turn it into JSON. The browser receives the response, applies the colour locally, invalidates the auth-status Query key and TanStack Query refreshes that cached data so other screens see the new value. The same path applies to larger CRUD actions, with the relevant page/component and endpoint changing.

## Coverage and reproducibility

Coverage is literal path coverage, not a claim that every file content was read. Reproduce with git ls-files | wc -l (645). Category totals are 441 attached_assets, 122 client, 22 server, 22 migrations, 18 root, 6 scripts, 6 .agents, 4 shared, 2 reports and 2 privacy_documents. The exact appendices below are generated directly from git ls-files; every tracked path appears at least once. Attached assets and migration metadata are compact appendices; attached asset contents were not read.

## Appendix A — normal tracked files (individual catalogue)

| Path | Language/type | Purpose | Communication/dependencies |
|---|---|---|---|
| .agents/agent_assets_metadata.toml | toml | Agent metadata/memory agent assets metadata: records repository exploration or development context; not imported by the application. | Consumed by its owning tool or read by maintainers; no direct runtime request path. |
| .agents/memory/MEMORY.md | md | Agent metadata/memory MEMORY: records repository exploration or development context; not imported by the application. | Consumed by its owning tool or read by maintainers; no direct runtime request path. |
| .agents/memory/development-schema-merges.md | md | Agent metadata/memory development schema merges: records repository exploration or development context; not imported by the application. | Consumed by its owning tool or read by maintainers; no direct runtime request path. |
| .agents/memory/mobile-overlay-positioning.md | md | Agent metadata/memory mobile overlay positioning: records repository exploration or development context; not imported by the application. | Consumed by its owning tool or read by maintainers; no direct runtime request path. |
| .agents/memory/season-planner-contract.md | md | Agent metadata/memory season planner contract: records repository exploration or development context; not imported by the application. | Consumed by its owning tool or read by maintainers; no direct runtime request path. |
| .agents/memory/session-estimate-interpretation.md | md | Agent metadata/memory session estimate interpretation: records repository exploration or development context; not imported by the application. | Consumed by its owning tool or read by maintainers; no direct runtime request path. |
| .gitignore | gitignore | Repository hygiene rules: excludes dependencies, build output, server/public, OS files, archives and generated Vite variants. | Consumed by its owning tool or read by maintainers; no direct runtime request path. |
| .replit | replit | Replit deployment metadata: declares Node/web/Python/PostgreSQL modules, port 5000, autoscale build/run commands and integrations. Python support is environment-only. | Consumed by its owning tool or read by maintainers; no direct runtime request path. |
| AI_PARSING_IMPLEMENTATION_PLAN.md | md | Implementation plan for AI parsing; documents expected parser behavior and integration decisions. | Consumed by its owning tool or read by maintainers; no direct runtime request path. |
| COACH_TRAINING_SESSION_PARSER.md | md | Domain requirements for converting coach session prose into structured training data. | Consumed by its owning tool or read by maintainers; no direct runtime request path. |
| client/index.html | html | HTML shell: defines the browser root element, document metadata and frontend entry loaded by Vite. | Referenced by Vite/client; mounts client/src/main.tsx and serves static public assets. |
| client/public/apple-touch-icon.png | png | Static browser/app icon asset apple touch icon: copied/served by the frontend manifest and browser shell; no application code dependency. | Referenced by client/index.html or manifest.json; no server communication. |
| client/public/favicon.ico | ico | Static browser/app icon asset favicon: copied/served by the frontend manifest and browser shell; no application code dependency. | Referenced by client/index.html or manifest.json; no server communication. |
| client/public/favicon.png | png | Static browser/app icon asset favicon: copied/served by the frontend manifest and browser shell; no application code dependency. | Referenced by client/index.html or manifest.json; no server communication. |
| client/public/icon-192.png | png | Static browser/app icon asset icon 192: copied/served by the frontend manifest and browser shell; no application code dependency. | Referenced by client/index.html or manifest.json; no server communication. |
| client/public/icon-512.png | png | Static browser/app icon asset icon 512: copied/served by the frontend manifest and browser shell; no application code dependency. | Referenced by client/index.html or manifest.json; no server communication. |
| client/public/manifest.json | json | Static browser/app icon asset manifest: copied/served by the frontend manifest and browser shell; no application code dependency. | Referenced by client/index.html or manifest.json; no server communication. |
| client/public/play-store-icon.png | png | Static browser/app icon asset play store icon: copied/served by the frontend manifest and browser shell; no application code dependency. | Referenced by client/index.html or manifest.json; no server communication. |
| client/src/App.tsx | tsx | Application shell: supplies QueryClient/auth context, selects Wouter views, and coordinates navigation, billing, calendars and management features. Imports pages, feature components, hooks and shared schema types. | Imports pages/components/hooks, shared schema types and queryClient; issues /api requests through that client. |
| client/src/components/AiChatPanel.tsx | tsx | AI coaching chat panel: sends coach questions/context to the assistant endpoint and renders returned guidance. | Imported by App or page views; component-specific dependency behavior was not individually inspected. |
| client/src/components/CollapsibleSidebar.tsx | tsx | Responsive navigation sidebar: switches calendar/management views and collapses for tablet/mobile layouts. | Imported by App or page views; component-specific dependency behavior was not individually inspected. |
| client/src/components/CompetitionDetailModal.tsx | tsx | Competition modal: displays selected competition details and coaching assignments with action callbacks. | Imported by App or page views; component-specific dependency behavior was not individually inspected. |
| client/src/components/DrillsLibrarySidebar.tsx | tsx | Drill picker sidebar: filters/selects drills while composing session content. | Imported by App or page views; component-specific dependency behavior was not individually inspected. |
| client/src/components/DrillsSidebar.tsx | tsx | Session drill sidebar: exposes detected/available drill references alongside the session editor. | Imported by App or page views; component-specific dependency behavior was not individually inspected. |
| client/src/components/DuplicateSessionModal.tsx | tsx | Duplication dialog: confirms a source session and submits a duplicate request before refreshing calendar data. | Imported by App or page views; component-specific dependency behavior was not individually inspected. |
| client/src/components/FeedbackForm.tsx | tsx | Coach feedback form: validates and submits session feedback, then invalidates feedback queries. | Imported by App or page views; component-specific dependency behavior was not individually inspected. |
| client/src/components/HomePage.tsx | tsx | Authenticated home navigation/dashboard component linking the main coaching workflows. | Imported by App or page views; component-specific dependency behavior was not individually inspected. |
| client/src/components/LoadingScreen.tsx | tsx | Initial loading screen displayed while auth/session state is determined. | Imported by App or page views; component-specific dependency behavior was not individually inspected. |
| client/src/components/RichTextEditor.tsx | tsx | Rich-text session editor: maintains formatted HTML/text and communicates edited content to its parent form. | Imported by App or page views; component-specific dependency behavior was not individually inspected. |
| client/src/components/SessionSearch.tsx | tsx | Session search control: queries/filters sessions and returns a selected result to calendar navigation. | Imported by App or page views; component-specific dependency behavior was not individually inspected. |
| client/src/components/SessionWriterHelper.tsx | tsx | AI session-writing helper: sends planning context for recommendations and inserts chosen suggestions into the editor. | Imported by App or page views; component-specific dependency behavior was not individually inspected. |
| client/src/components/SwimmerProfilePage.tsx | tsx | Swimmer profile detail component: presents one swimmer's identity, squad and related performance/session information. | Imported by App or page views; component-specific dependency behavior was not individually inspected. |
| client/src/components/SwimmerProfiles.tsx | tsx | Swimmer profile collection component: lists profiles and routes selection into the profile detail view. | Imported by App or page views; component-specific dependency behavior was not individually inspected. |
| client/src/components/ui/accordion.tsx | tsx | Reusable frontend UI primitive: composes expand/collapse disclosure behavior with the underlying UI-library or HTML behavior and project styles. | Imported by frontend views/components and composes UI primitives/styles; no direct API or network behavior is asserted. |
| client/src/components/ui/alert-dialog.tsx | tsx | Reusable frontend UI primitive: composes modal alert and confirmation behavior with the underlying UI-library or HTML behavior and project styles. | Imported by frontend views/components and composes UI primitives/styles; no direct API or network behavior is asserted. |
| client/src/components/ui/alert.tsx | tsx | Reusable frontend UI primitive: composes inline alert/status messaging with the underlying UI-library or HTML behavior and project styles. | Imported by frontend views/components and composes UI primitives/styles; no direct API or network behavior is asserted. |
| client/src/components/ui/aspect-ratio.tsx | tsx | Reusable frontend UI primitive: composes responsive aspect-ratio layout with the underlying UI-library or HTML behavior and project styles. | Imported by frontend views/components and composes UI primitives/styles; no direct API or network behavior is asserted. |
| client/src/components/ui/avatar.tsx | tsx | Reusable frontend UI primitive: composes avatar/image fallback presentation with the underlying UI-library or HTML behavior and project styles. | Imported by frontend views/components and composes UI primitives/styles; no direct API or network behavior is asserted. |
| client/src/components/ui/badge.tsx | tsx | Reusable frontend UI primitive: composes compact status label styling with the underlying UI-library or HTML behavior and project styles. | Imported by frontend views/components and composes UI primitives/styles; no direct API or network behavior is asserted. |
| client/src/components/ui/breadcrumb.tsx | tsx | Reusable frontend UI primitive: composes hierarchical navigation trail with the underlying UI-library or HTML behavior and project styles. | Imported by frontend views/components and composes UI primitives/styles; no direct API or network behavior is asserted. |
| client/src/components/ui/button.tsx | tsx | Reusable frontend UI primitive: composes button and action control behavior with the underlying UI-library or HTML behavior and project styles. | Imported by frontend views/components and composes UI primitives/styles; no direct API or network behavior is asserted. |
| client/src/components/ui/calendar.tsx | tsx | Reusable frontend UI primitive: composes date-picker/calendar interaction with the underlying UI-library or HTML behavior and project styles. | Imported by frontend views/components and composes UI primitives/styles; no direct API or network behavior is asserted. |
| client/src/components/ui/card.tsx | tsx | Reusable frontend UI primitive: composes card UI behavior with the underlying UI-library or HTML behavior and project styles. | Imported by frontend views/components and composes UI primitives/styles; no direct API or network behavior is asserted. |
| client/src/components/ui/carousel.tsx | tsx | Reusable frontend UI primitive: composes horizontal item carousel behavior with the underlying UI-library or HTML behavior and project styles. | Imported by frontend views/components and composes UI primitives/styles; no direct API or network behavior is asserted. |
| client/src/components/ui/chart.tsx | tsx | Reusable frontend UI primitive: composes data-chart presentation primitives with the underlying UI-library or HTML behavior and project styles. | Imported by frontend views/components and composes UI primitives/styles; no direct API or network behavior is asserted. |
| client/src/components/ui/checkbox.tsx | tsx | Reusable frontend UI primitive: composes boolean checkbox selection with the underlying UI-library or HTML behavior and project styles. | Imported by frontend views/components and composes UI primitives/styles; no direct API or network behavior is asserted. |
| client/src/components/ui/collapsible.tsx | tsx | Reusable frontend UI primitive: composes expand/collapse panel behavior with the underlying UI-library or HTML behavior and project styles. | Imported by frontend views/components and composes UI primitives/styles; no direct API or network behavior is asserted. |
| client/src/components/ui/command.tsx | tsx | Reusable frontend UI primitive: composes command palette/search-list behavior with the underlying UI-library or HTML behavior and project styles. | Imported by frontend views/components and composes UI primitives/styles; no direct API or network behavior is asserted. |
| client/src/components/ui/context-menu.tsx | tsx | Reusable frontend UI primitive: composes right-click/context menu behavior with the underlying UI-library or HTML behavior and project styles. | Imported by frontend views/components and composes UI primitives/styles; no direct API or network behavior is asserted. |
| client/src/components/ui/dialog.tsx | tsx | Reusable frontend UI primitive: composes modal dialog behavior with the underlying UI-library or HTML behavior and project styles. | Imported by frontend views/components and composes UI primitives/styles; no direct API or network behavior is asserted. |
| client/src/components/ui/drawer.tsx | tsx | Reusable frontend UI primitive: composes slide-out drawer behavior with the underlying UI-library or HTML behavior and project styles. | Imported by frontend views/components and composes UI primitives/styles; no direct API or network behavior is asserted. |
| client/src/components/ui/dropdown-menu.tsx | tsx | Reusable frontend UI primitive: composes dropdown menu behavior with the underlying UI-library or HTML behavior and project styles. | Imported by frontend views/components and composes UI primitives/styles; no direct API or network behavior is asserted. |
| client/src/components/ui/form.tsx | tsx | Reusable frontend UI primitive: composes form field composition and validation presentation with the underlying UI-library or HTML behavior and project styles. | Imported by frontend views/components and composes UI primitives/styles; no direct API or network behavior is asserted. |
| client/src/components/ui/hover-card.tsx | tsx | Reusable frontend UI primitive: composes hover/focus card behavior with the underlying UI-library or HTML behavior and project styles. | Imported by frontend views/components and composes UI primitives/styles; no direct API or network behavior is asserted. |
| client/src/components/ui/input-otp.tsx | tsx | Reusable frontend UI primitive: composes one-time-code input behavior with the underlying UI-library or HTML behavior and project styles. | Imported by frontend views/components and composes UI primitives/styles; no direct API or network behavior is asserted. |
| client/src/components/ui/input.tsx | tsx | Reusable frontend UI primitive: composes text input behavior with the underlying UI-library or HTML behavior and project styles. | Imported by frontend views/components and composes UI primitives/styles; no direct API or network behavior is asserted. |
| client/src/components/ui/label.tsx | tsx | Reusable frontend UI primitive: composes form-label association with the underlying UI-library or HTML behavior and project styles. | Imported by frontend views/components and composes UI primitives/styles; no direct API or network behavior is asserted. |
| client/src/components/ui/menubar.tsx | tsx | Reusable frontend UI primitive: composes menu-bar navigation behavior with the underlying UI-library or HTML behavior and project styles. | Imported by frontend views/components and composes UI primitives/styles; no direct API or network behavior is asserted. |
| client/src/components/ui/navigation-menu.tsx | tsx | Reusable frontend UI primitive: composes navigation menu behavior with the underlying UI-library or HTML behavior and project styles. | Imported by frontend views/components and composes UI primitives/styles; no direct API or network behavior is asserted. |
| client/src/components/ui/pagination.tsx | tsx | Reusable frontend UI primitive: composes pagination control behavior with the underlying UI-library or HTML behavior and project styles. | Imported by frontend views/components and composes UI primitives/styles; no direct API or network behavior is asserted. |
| client/src/components/ui/popover.tsx | tsx | Reusable frontend UI primitive: composes anchored popover behavior with the underlying UI-library or HTML behavior and project styles. | Imported by frontend views/components and composes UI primitives/styles; no direct API or network behavior is asserted. |
| client/src/components/ui/progress.tsx | tsx | Reusable frontend UI primitive: composes progress indicator presentation with the underlying UI-library or HTML behavior and project styles. | Imported by frontend views/components and composes UI primitives/styles; no direct API or network behavior is asserted. |
| client/src/components/ui/radio-group.tsx | tsx | Reusable frontend UI primitive: composes single-choice radio group behavior with the underlying UI-library or HTML behavior and project styles. | Imported by frontend views/components and composes UI primitives/styles; no direct API or network behavior is asserted. |
| client/src/components/ui/resizable.tsx | tsx | Reusable frontend UI primitive: composes resizable panel layout behavior with the underlying UI-library or HTML behavior and project styles. | Imported by frontend views/components and composes UI primitives/styles; no direct API or network behavior is asserted. |
| client/src/components/ui/scroll-area.tsx | tsx | Reusable frontend UI primitive: composes scrollable viewport behavior with the underlying UI-library or HTML behavior and project styles. | Imported by frontend views/components and composes UI primitives/styles; no direct API or network behavior is asserted. |
| client/src/components/ui/select.tsx | tsx | Reusable frontend UI primitive: composes select menu behavior with the underlying UI-library or HTML behavior and project styles. | Imported by frontend views/components and composes UI primitives/styles; no direct API or network behavior is asserted. |
| client/src/components/ui/separator.tsx | tsx | Reusable frontend UI primitive: composes visual/content separation with the underlying UI-library or HTML behavior and project styles. | Imported by frontend views/components and composes UI primitives/styles; no direct API or network behavior is asserted. |
| client/src/components/ui/sheet.tsx | tsx | Reusable frontend UI primitive: composes side sheet/modal behavior with the underlying UI-library or HTML behavior and project styles. | Imported by frontend views/components and composes UI primitives/styles; no direct API or network behavior is asserted. |
| client/src/components/ui/sidebar.tsx | tsx | Reusable frontend UI primitive: composes sidebar layout/navigation behavior with the underlying UI-library or HTML behavior and project styles. | Imported by frontend views/components and composes UI primitives/styles; no direct API or network behavior is asserted. |
| client/src/components/ui/skeleton.tsx | tsx | Reusable frontend UI primitive: composes loading placeholder presentation with the underlying UI-library or HTML behavior and project styles. | Imported by frontend views/components and composes UI primitives/styles; no direct API or network behavior is asserted. |
| client/src/components/ui/slider.tsx | tsx | Reusable frontend UI primitive: composes range slider behavior with the underlying UI-library or HTML behavior and project styles. | Imported by frontend views/components and composes UI primitives/styles; no direct API or network behavior is asserted. |
| client/src/components/ui/switch.tsx | tsx | Reusable frontend UI primitive: composes on/off switch behavior with the underlying UI-library or HTML behavior and project styles. | Imported by frontend views/components and composes UI primitives/styles; no direct API or network behavior is asserted. |
| client/src/components/ui/table.tsx | tsx | Reusable frontend UI primitive: composes tabular data layout with the underlying UI-library or HTML behavior and project styles. | Imported by frontend views/components and composes UI primitives/styles; no direct API or network behavior is asserted. |
| client/src/components/ui/tabs.tsx | tsx | Reusable frontend UI primitive: composes tab selection behavior with the underlying UI-library or HTML behavior and project styles. | Imported by frontend views/components and composes UI primitives/styles; no direct API or network behavior is asserted. |
| client/src/components/ui/textarea.tsx | tsx | Reusable frontend UI primitive: composes multiline text input with the underlying UI-library or HTML behavior and project styles. | Imported by frontend views/components and composes UI primitives/styles; no direct API or network behavior is asserted. |
| client/src/components/ui/toast.tsx | tsx | Reusable frontend UI primitive: composes transient notification behavior with the underlying UI-library or HTML behavior and project styles. | Imported by frontend views/components and composes UI primitives/styles; no direct API or network behavior is asserted. |
| client/src/components/ui/toaster.tsx | tsx | Reusable frontend UI primitive: composes toast notification hosting with the underlying UI-library or HTML behavior and project styles. | Imported by frontend views/components and composes UI primitives/styles; no direct API or network behavior is asserted. |
| client/src/components/ui/toggle-group.tsx | tsx | Reusable frontend UI primitive: composes grouped toggle behavior with the underlying UI-library or HTML behavior and project styles. | Imported by frontend views/components and composes UI primitives/styles; no direct API or network behavior is asserted. |
| client/src/components/ui/toggle.tsx | tsx | Reusable frontend UI primitive: composes toggle control behavior with the underlying UI-library or HTML behavior and project styles. | Imported by frontend views/components and composes UI primitives/styles; no direct API or network behavior is asserted. |
| client/src/components/ui/tooltip.tsx | tsx | Reusable frontend UI primitive: composes hover/focus explanatory tooltip behavior with the underlying UI-library or HTML behavior and project styles. | Imported by frontend views/components and composes UI primitives/styles; no direct API or network behavior is asserted. |
| client/src/hooks/use-mobile.tsx | tsx | Client hook for use mobile: encapsulates reusable browser/auth/responsive/native behavior for pages and components. | Imported by frontend views; module-specific dependency behavior was not individually inspected. |
| client/src/hooks/use-native-app.ts | ts | Client hook for use native app: encapsulates reusable browser/auth/responsive/native behavior for pages and components. | Imported by frontend views; module-specific dependency behavior was not individually inspected. |
| client/src/hooks/use-toast.ts | ts | Client hook for use toast: encapsulates reusable browser/auth/responsive/native behavior for pages and components. | Imported by frontend views; module-specific dependency behavior was not individually inspected. |
| client/src/hooks/useAuth.ts | ts | Client hook for useAuth: encapsulates reusable browser/auth/responsive/native behavior for pages and components. | Imported by frontend views; module-specific dependency behavior was not individually inspected. |
| client/src/index.css | css | Runtime frontend stylesheet: defines global resets, theme variables, typography and Tailwind/component styles used by the mounted React app. | Imported by client/src/main.tsx; affects browser rendering and does not define API behavior. |
| client/src/lib/authUtils.ts | ts | Client library authUtils: adapts or validates domain values between React views, shared types and API payloads. | Imported by frontend views; module-specific dependency behavior was not individually inspected. |
| client/src/lib/queryClient.ts | ts | Central HTTP boundary: sends credentialed JSON fetches to Express, raises non-OK errors, and configures TanStack Query caching/invalidation behavior. | Imported by frontend views; module-specific dependency behavior was not individually inspected. |
| client/src/lib/typeAdapters.ts | ts | Client library typeAdapters: adapts or validates domain values between React views, shared types and API payloads. | Imported by frontend views; module-specific dependency behavior was not individually inspected. |
| client/src/lib/utils.ts | ts | Client library utils: adapts or validates domain values between React views, shared types and API payloads. | Imported by frontend views; module-specific dependency behavior was not individually inspected. |
| client/src/main.tsx | tsx | Browser bootstrap: finds the root element, renders App, and loads global CSS. Communicates with App and the Vite client entry. | Consumed by its owning tool or read by maintainers; no direct runtime request path. |
| client/src/pages/add-session.tsx | tsx | Creates a new swimming session: collects date/time, pool, squad, coaches, focus and rich session content, then posts validated session data and refreshes calendar queries. | Selected by App routing; page-specific request/dependency behavior was not individually inspected. |
| client/src/pages/attendance-analysis.tsx | tsx | Analyzes attendance trends and statuses for the club, fetching attendance/session data and presenting summaries for coaches. | Selected by App routing; page-specific request/dependency behavior was not individually inspected. |
| client/src/pages/availability-cover.tsx | tsx | Lets coaches record absences, browse cover opportunities and claim/manage cover; exchanges availability and cover records with protected API routes. | Selected by App routing; page-specific request/dependency behavior was not individually inspected. |
| client/src/pages/billing.tsx | tsx | Admin billing screen: reads subscription status/tiers and opens the Stripe Customer Portal or cancellation flow through billing endpoints. | Selected by App routing; page-specific request/dependency behavior was not individually inspected. |
| client/src/pages/calendar-table-view.tsx | tsx | Desktop tabular calendar: queries sessions/competitions and renders a dense date-oriented table with selection callbacks. | Selected by App routing; page-specific request/dependency behavior was not individually inspected. |
| client/src/pages/coaches.tsx | tsx | Coach listing/management view: reads club coaches and supports the coach administration actions exposed by routes. | Selected by App routing; page-specific request/dependency behavior was not individually inspected. |
| client/src/pages/dashboard.tsx | tsx | Home dashboard: combines session, attendance, distance and competition summaries from cached API resources. | Selected by App routing; page-specific request/dependency behavior was not individually inspected. |
| client/src/pages/day-calendar-view.tsx | tsx | Day calendar: filters sessions and competitions for one date and opens detail/attendance actions. | Selected by App routing; page-specific request/dependency behavior was not individually inspected. |
| client/src/pages/day-list-view.tsx | tsx | Day list alternative: presents one day's sessions in a mobile-friendly list and links to session details. | Selected by App routing; page-specific request/dependency behavior was not individually inspected. |
| client/src/pages/drills-library.tsx | tsx | Drills library: searches, filters and edits club drills, including descriptions/stroke categories and video links. | Selected by App routing; page-specific request/dependency behavior was not individually inspected. |
| client/src/pages/edit-session.tsx | tsx | Session editor: loads an existing session, validates changes and updates its metadata/content, attendance-related associations and distances. | Selected by App routing; page-specific request/dependency behavior was not individually inspected. |
| client/src/pages/feedback-analytics.tsx | tsx | Feedback analytics: loads coach/session feedback and presents aggregate patterns plus AI-assisted insight results. | Selected by App routing; page-specific request/dependency behavior was not individually inspected. |
| client/src/pages/forgot-password-page.tsx | tsx | Starts password recovery by submitting an email to the reset-token endpoint and reporting delivery status. | Selected by App routing; page-specific request/dependency behavior was not individually inspected. |
| client/src/pages/handbook.tsx | tsx | Handbook/document view: lists, previews and manages club documents and coaching notes through protected API resources. | Selected by App routing; page-specific request/dependency behavior was not individually inspected. |
| client/src/pages/invoice-tracker.tsx | tsx | Invoice tracker: records/displays coaching invoice information and connects rate/session data to administrative views. | Selected by App routing; page-specific request/dependency behavior was not individually inspected. |
| client/src/pages/landing.tsx | tsx | Landing route: shows loading/authentication state and redirects visitors to login or the authenticated app. | Selected by App routing; page-specific request/dependency behavior was not individually inspected. |
| client/src/pages/locations.tsx | tsx | Pool/location administration: lists, creates, edits and soft-deletes club pool locations. | Selected by App routing; page-specific request/dependency behavior was not individually inspected. |
| client/src/pages/login-page.tsx | tsx | Email/password login screen: submits credentials, handles session response/errors and redirects authenticated users. | Selected by App routing; page-specific request/dependency behavior was not individually inspected. |
| client/src/pages/manage-coaches.tsx | tsx | Admin coach management: invites, links, edits, deactivates/reactivates coaches and reflects billing quantity changes. | Selected by App routing; page-specific request/dependency behavior was not individually inspected. |
| client/src/pages/manage-coaching-rates.tsx | tsx | Admin rate editor: loads qualification-level hourly/session-writing rates and saves validated rate changes. | Selected by App routing; page-specific request/dependency behavior was not individually inspected. |
| client/src/pages/manage-competitions.tsx | tsx | Competition administration: creates, edits and removes club competitions and coaching assignments. | Selected by App routing; page-specific request/dependency behavior was not individually inspected. |
| client/src/pages/manage-invitations.tsx | tsx | Invitation administration: lists sanitized invitations and sends, resends, reissues or revokes coach invitations. | Selected by App routing; page-specific request/dependency behavior was not individually inspected. |
| client/src/pages/manage-locations.tsx | tsx | Admin location manager: maintains pools used by sessions and competitions. | Selected by App routing; page-specific request/dependency behavior was not individually inspected. |
| client/src/pages/manage-squads.tsx | tsx | Squad administration: manages squad names, colors, average pace and primary-coach relationships. | Selected by App routing; page-specific request/dependency behavior was not individually inspected. |
| client/src/pages/manage-swimmers.tsx | tsx | Swimmer administration: creates/edits/soft-deletes swimmers, assigns squads and supports grid/reordering workflows. | Selected by App routing; page-specific request/dependency behavior was not individually inspected. |
| client/src/pages/month-calendar-view.tsx | tsx | Month calendar: fetches sessions and competitions for a month, displays distinct event types and opens selected records. | Selected by App routing; page-specific request/dependency behavior was not individually inspected. |
| client/src/pages/new-session.tsx | tsx | New-session form variant: gathers and validates session scheduling/content fields before calling the session API. | Selected by App routing; page-specific request/dependency behavior was not individually inspected. |
| client/src/pages/not-found.tsx | tsx | Fallback route view for unknown URLs; communicates only with client routing/navigation. | Selected by App routing; page-specific request/dependency behavior was not individually inspected. |
| client/src/pages/register-cancelled-page.tsx | tsx | Stripe registration cancellation result page; explains that checkout was cancelled and offers navigation back. | Selected by App routing; page-specific request/dependency behavior was not individually inspected. |
| client/src/pages/register-club-page.tsx | tsx | Club signup form: collects registration details and begins the Stripe-backed club subscription flow. | Selected by App routing; page-specific request/dependency behavior was not individually inspected. |
| client/src/pages/register-success-page.tsx | tsx | Stripe registration success page: confirms signup and guides the new club toward account setup. | Selected by App routing; page-specific request/dependency behavior was not individually inspected. |
| client/src/pages/registration-page.tsx | tsx | Invitation registration form: validates invite email/password, creates the user and establishes the authenticated session. | Selected by App routing; page-specific request/dependency behavior was not individually inspected. |
| client/src/pages/reset-password-page.tsx | tsx | Password reset form: validates a reset token and strong password, then submits the update to auth routes. | Selected by App routing; page-specific request/dependency behavior was not individually inspected. |
| client/src/pages/schedule-manager.tsx | tsx | Admin recurring-schedule manager: creates templates, generates sessions and surfaces sessions needing cover. | Selected by App routing; page-specific request/dependency behavior was not individually inspected. |
| client/src/pages/season-planner.tsx | tsx | Season planner: creates/edits versioned plans and entries for selected squads, using planner validation and matching APIs. | Selected by App routing; page-specific request/dependency behavior was not individually inspected. |
| client/src/pages/session-detail-view.tsx | tsx | Session detail view: loads metadata/content/attendance, supports duplication and editing, and displays distances/drills. | Selected by App routing; page-specific request/dependency behavior was not individually inspected. |
| client/src/pages/session-detail.tsx | tsx | Alternate session detail implementation: renders a selected session and its attendance/content actions from API data. | Selected by App routing; page-specific request/dependency behavior was not individually inspected. |
| client/src/pages/session-library.tsx | tsx | Session template library: lists, creates, edits, reuses and deletes reusable coach session templates. | Selected by App routing; page-specific request/dependency behavior was not individually inspected. |
| client/src/pages/squad-overview-grid.tsx | tsx | Page view for “squad overview grid”: renders the squad overview grid workflow, reads/writes its API resources through queryClient and composes shared UI/components. | Selected by App routing; page-specific request/dependency behavior was not individually inspected. |
| client/src/pages/squads.tsx | tsx | Squad listing view: reads active club squads and links to squad management actions. | Selected by App routing; page-specific request/dependency behavior was not individually inspected. |
| client/src/pages/swimmers.tsx | tsx | Swimmer listing view: queries swimmers and supports navigation to profiles and management operations. | Selected by App routing; page-specific request/dependency behavior was not individually inspected. |
| client/src/pages/verify-email-page.tsx | tsx | Email verification result page: submits a verification token and reports whether the account is verified. | Selected by App routing; page-specific request/dependency behavior was not individually inspected. |
| components.json | json | shadcn/ui component-generation configuration used by frontend primitives. | Consumed by its owning tool or read by maintainers; no direct runtime request path. |
| design_guidelines.md | md | UI/product design guidance used to keep screens consistent and mobile-first. | Consumed by its owning tool or read by maintainers; no direct runtime request path. |
| drizzle.config.ts | ts | Migration config: points Drizzle Kit at shared/schema.ts, PostgreSQL dialect and DATABASE_URL, with output under migrations. | Consumed by its owning tool or read by maintainers; no direct runtime request path. |
| migrations/0000_deep_warpath.sql | sql | Ordered PostgreSQL migration 0000 deep warpath: changes the database schema/data for the corresponding feature; must remain in sequence and agree with shared/schema.ts. | Applied to PostgreSQL by Drizzle Kit; must match shared/schema.ts and prior migrations. |
| migrations/0001_add_record_status.sql | sql | Ordered PostgreSQL migration 0001 add record status: changes the database schema/data for the corresponding feature; must remain in sequence and agree with shared/schema.ts. | Applied to PostgreSQL by Drizzle Kit; must match shared/schema.ts and prior migrations. |
| migrations/0001_secret_mockingbird.sql | sql | Ordered PostgreSQL migration 0001 secret mockingbird: changes the database schema/data for the corresponding feature; must remain in sequence and agree with shared/schema.ts. | Applied to PostgreSQL by Drizzle Kit; must match shared/schema.ts and prior migrations. |
| migrations/0002_past_angel.sql | sql | Ordered PostgreSQL migration 0002 past angel: changes the database schema/data for the corresponding feature; must remain in sequence and agree with shared/schema.ts. | Applied to PostgreSQL by Drizzle Kit; must match shared/schema.ts and prior migrations. |
| migrations/0003_fat_wild_pack.sql | sql | Ordered PostgreSQL migration 0003 fat wild pack: changes the database schema/data for the corresponding feature; must remain in sequence and agree with shared/schema.ts. | Applied to PostgreSQL by Drizzle Kit; must match shared/schema.ts and prior migrations. |
| migrations/0004_mysterious_ma_gnuci.sql | sql | Ordered PostgreSQL migration 0004 mysterious ma gnuci: changes the database schema/data for the corresponding feature; must remain in sequence and agree with shared/schema.ts. | Applied to PostgreSQL by Drizzle Kit; must match shared/schema.ts and prior migrations. |
| migrations/0005_panoramic_joseph.sql | sql | Ordered PostgreSQL migration 0005 panoramic joseph: changes the database schema/data for the corresponding feature; must remain in sequence and agree with shared/schema.ts. | Applied to PostgreSQL by Drizzle Kit; must match shared/schema.ts and prior migrations. |
| migrations/0006_add_club_color.sql | sql | Ordered PostgreSQL migration 0006 add club color: changes the database schema/data for the corresponding feature; must remain in sequence and agree with shared/schema.ts. | Applied to PostgreSQL by Drizzle Kit; must match shared/schema.ts and prior migrations. |
| migrations/0006_add_stripe_billing_columns.sql | sql | Ordered PostgreSQL migration 0006 add stripe billing columns: changes the database schema/data for the corresponding feature; must remain in sequence and agree with shared/schema.ts. | Applied to PostgreSQL by Drizzle Kit; must match shared/schema.ts and prior migrations. |
| migrations/0007_add_pending_registrations.sql | sql | Ordered PostgreSQL migration 0007 add pending registrations: changes the database schema/data for the corresponding feature; must remain in sequence and agree with shared/schema.ts. | Applied to PostgreSQL by Drizzle Kit; must match shared/schema.ts and prior migrations. |
| migrations/0008_season_planner.sql | sql | Ordered PostgreSQL migration 0008 season planner: changes the database schema/data for the corresponding feature; must remain in sequence and agree with shared/schema.ts. | Applied to PostgreSQL by Drizzle Kit; must match shared/schema.ts and prior migrations. |
| migrations/0009_add_squad_average_50m_seconds.sql | sql | Ordered PostgreSQL migration 0009 add squad average 50m seconds: changes the database schema/data for the corresponding feature; must remain in sequence and agree with shared/schema.ts. | Applied to PostgreSQL by Drizzle Kit; must match shared/schema.ts and prior migrations. |
| migrations/0010_deduplicate_active_attendance.sql | sql | Ordered PostgreSQL migration 0010 deduplicate active attendance: changes the database schema/data for the corresponding feature; must remain in sequence and agree with shared/schema.ts. | Applied to PostgreSQL by Drizzle Kit; must match shared/schema.ts and prior migrations. |
| package-lock.json | json | JSON metadata package lock: tool or migration state consumed by its owning build/database tool, not runtime business logic. | Consumed by its owning tool or read by maintainers; no direct runtime request path. |
| package.json | json | Project manifest: defines dev/build/start/check/db:push commands and runtime/development dependencies; package-lock.json is resolved dependency state, not first-party code. | Consumed by its owning tool or read by maintainers; no direct runtime request path. |
| postcss.config.js | js | PostCSS/Tailwind processing configuration consumed by the Vite CSS build. | Consumed by its owning tool or read by maintainers; no direct runtime request path. |
| privacy_documents/data_notice_parents_swimmers.md | md | Privacy notice for parent/swimmer data handling; legal reference for product owners, not runtime logic. | Consumed by its owning tool or read by maintainers; no direct runtime request path. |
| privacy_documents/privacy_policy_coaches.md | md | Privacy policy for coach accounts and processing; legal reference for public privacy routes. | Consumed by its owning tool or read by maintainers; no direct runtime request path. |
| replit.md | md | Product/architecture handover: describes SwimCoach capabilities, auth, database, AI, billing and native restrictions for maintainers. | Consumed by its owning tool or read by maintainers; no direct runtime request path. |
| reports/attendance-duplicate-audit-2026-09-12.csv | csv | CSV report attendance duplicate audit 2026 09 12: exported/audit data for owner review; generated output rather than runtime source. | Consumed by its owning tool or read by maintainers; no direct runtime request path. |
| reports/projected-attendance-card-after-deduplication-2026-09-12.csv | csv | CSV report projected attendance card after deduplication 2026 09 12: exported/audit data for owner review; generated output rather than runtime source. | Consumed by its owning tool or read by maintainers; no direct runtime request path. |
| scripts/README.md | md | Operator notes for scripts: explains how the repository maintenance/seed utilities are intended to be run. | Run manually or by post-merge/deployment; communicates with configured database/Stripe as indicated by filename. |
| scripts/apply-development-migrations.ts | ts | Development database utility: applies tracked migration changes against the configured database for local development. | Run manually or by post-merge/deployment; communicates with configured database/Stripe as indicated by filename. |
| scripts/create-admin.ts | ts | Operations utility: creates an initial administrator account using server auth/storage conventions. | Run manually or by post-merge/deployment; communicates with configured database/Stripe as indicated by filename. |
| scripts/post-merge.sh | sh | Post-merge hook: runs repository maintenance configured by Replit after merges. | Run manually or by post-merge/deployment; communicates with configured database/Stripe as indicated by filename. |
| scripts/promote-admin.ts | ts | Operations utility: promotes an existing user to administrator after explicit operator action. | Run manually or by post-merge/deployment; communicates with configured database/Stripe as indicated by filename. |
| scripts/seed-stripe-products.ts | ts | Stripe setup utility: creates or seeds product/price records for subscription environments. | Run manually or by post-merge/deployment; communicates with configured database/Stripe as indicated by filename. |
| server/aiAssistant.ts | ts | Builds AI assistant prompts and handles coaching recommendations returned to routes. | Imported by routes for AI-assistant responses; external AI behavior and persistence are described by its implementation. |
| server/aiParser.ts | ts | Parses session prose with AI for distances/drills and validates structured output. | Imported by routes for distance/drill parsing; it communicates with the configured AI client and returns validated values. |
| server/db.ts | ts | Database connection: creates the Neon serverless Pool and typed Drizzle client, exporting the shared schema to server modules. | Imported by storage/startup; creates the Neon Pool and Drizzle client for PostgreSQL access. |
| server/emailService.ts | ts | Sends invitation, verification and password-reset email through Resend. | Imported by authentication/invitation routes; sends messages through the configured Resend client. |
| server/index.ts | ts | Process bootstrap: configures Express parsing/logging, raw Stripe webhook handling, startup repairs, route registration, Vite/static serving and the listening port. | Process entry; imports routes, storage/database startup, Stripe sync, Vite serving and notifications. |
| server/newAuth.ts | ts | Implements invitation-based email/password auth, sessions, token flows and authorization middleware. | Registered by routes; uses session middleware, storage/Drizzle, password/token helpers, email service and Stripe sync where its flows require them. |
| server/notifications/apnsService.ts | ts | Notification module apnsService: checks/schedules session alerts or bridges stored device tokens to Apple push delivery; uses storage and server scheduling. | Imported by server modules as indicated by its role; broader dependency behavior was not individually inspected. |
| server/notifications/scheduler.ts | ts | Notification module scheduler: checks/schedules session alerts or bridges stored device tokens to Apple push delivery; uses storage and server scheduling. | Imported by server modules as indicated by its role; broader dependency behavior was not individually inspected. |
| server/notifications/sessionChecker.ts | ts | Notification module sessionChecker: checks/schedules session alerts or bridges stored device tokens to Apple push delivery; uses storage and server scheduling. | Imported by server modules as indicated by its role; broader dependency behavior was not individually inspected. |
| server/passwordUtils.ts | ts | Provides bcrypt password hashing and comparison used by authentication. | Imported by server modules as indicated by its role; broader dependency behavior was not individually inspected. |
| server/privacyRoutes.ts | ts | Serves public privacy-policy/data-notice routes. | Imported by server modules as indicated by its role; broader dependency behavior was not individually inspected. |
| server/routes.ts | ts | REST contract: registers domain endpoints, validates request bodies, applies auth/admin/club checks, and delegates persistence or external-service work. | Registered by server/index.ts; imports storage, shared validation, auth middleware and named AI/email/Stripe/planning services. |
| server/seasonPlanner.test.ts | ts | Tests season plan validation and generated-entry behavior. | Imported by server modules as indicated by its role; broader dependency behavior was not individually inspected. |
| server/seasonPlanner.ts | ts | Season-plan domain logic: validates entries and generates sessions/planning rows used by routes and storage. | Imported by server modules as indicated by its role; broader dependency behavior was not individually inspected. |
| server/session.d.ts | ts | Augments Express session TypeScript types with application user/session fields. | Imported by server modules as indicated by its role; broader dependency behavior was not individually inspected. |
| server/sessionSquads.test.ts | ts | Tests session/squad junction behavior and multi-squad constraints. | Imported by server modules as indicated by its role; broader dependency behavior was not individually inspected. |
| server/squadColors.ts | ts | Chooses the next available squad color for create/update operations. | Imported by server modules as indicated by its role; broader dependency behavior was not individually inspected. |
| server/storage.ts | ts | Persistence adapter: implements club-scoped CRUD for users, sessions, attendance, coaches, squads, billing-related records, notes, planning and notifications using Drizzle queries. | Imported by routes and services; uses the db export and shared schema for database operations. |
| server/stripeClient.ts | ts | Stripe integration client: selects environment keys, exposes Stripe operations and synchronises subscription quantities/customer data with clubs. | Imported by billing/auth/routes; calls Stripe and updates club subscription fields through storage. |
| server/tokenUtils.ts | ts | Creates and validates cryptographically random verification/reset tokens. | Imported by server modules as indicated by its role; broader dependency behavior was not individually inspected. |
| server/vite.ts | ts | Integrates Vite middleware in development and serves dist/public in production. | Imported by server modules as indicated by its role; broader dependency behavior was not individually inspected. |
| server/webhookHandlers.ts | ts | Processes verified Stripe webhook events into club/subscription state changes. | Imported by the Stripe webhook route; handles verified Stripe events and updates application billing records. |
| session_analysis.md | md | Analysis notes for session data/features; informs reporting and coaching analysis. | Consumed by its owning tool or read by maintainers; no direct runtime request path. |
| session_detail_error.png | png | Root/project asset session detail error: configuration, legal, report or static material used by the named tool or owner process. | Consumed by its owning tool or read by maintainers; no direct runtime request path. |
| shared/schema.ts | ts | Canonical data contract: declares PostgreSQL tables/relations, inferred TypeScript records and Zod insert/auth validation schemas consumed by routes, storage and migrations. | Imported by both client/server or its tests; defines a shared contract without network access. |
| shared/sessionParser.ts | ts | Shared session-text parser: converts coach-written set text into structured swimming information for server calculations and client forms. | Imported by both client/server or its tests; defines a shared contract without network access. |
| shared/sessionTimeEstimator.test.ts | ts | Automated unit coverage for session time estimation edge cases; imports the estimator and test runner. | Imported by both client/server or its tests; defines a shared contract without network access. |
| shared/sessionTimeEstimator.ts | ts | Shared time estimator: calculates expected session durations from set content and pool/session inputs; covered by its test. | Imported by both client/server or its tests; defines a shared contract without network access. |
| tailwind.config.ts | ts | Tailwind theme/content configuration consumed by client styles. | Consumed by its owning tool or read by maintainers; no direct runtime request path. |
| test-gpt-parser.ts | ts | Root/project asset test gpt parser: configuration, legal, report or static material used by the named tool or owner process. | Consumed by its owning tool or read by maintainers; no direct runtime request path. |
| tsconfig.json | json | TypeScript policy: strict no-emit checking for client/src, shared and server, with aliases @ and @shared; excludes generated dependencies and tests. | Consumed by its owning tool or read by maintainers; no direct runtime request path. |
| update_genders.sql | sql | SQL reference/output update genders: contains data or schema statements for database operations; review before applying. | Consumed by its owning tool or read by maintainers; no direct runtime request path. |
| vite.config.ts | TypeScript | Frontend build config: wires React and Replit plugins, path aliases, client root, strict filesystem policy and dist/public output. | Consumed by its owning tool or read by maintainers; no direct runtime request path. |

## Appendix B — migration metadata

| Path | Language/type | Purpose | Communication/dependencies |
|---|---|---|---|
| migrations/meta/0000_snapshot.json | json | Tracked Drizzle/PostgreSQL migration. | shared/schema.ts; PostgreSQL |
| migrations/meta/0001_snapshot.json | json | Tracked Drizzle/PostgreSQL migration. | shared/schema.ts; PostgreSQL |
| migrations/meta/0002_snapshot.json | json | Tracked Drizzle/PostgreSQL migration. | shared/schema.ts; PostgreSQL |
| migrations/meta/0003_snapshot.json | json | Tracked Drizzle/PostgreSQL migration. | shared/schema.ts; PostgreSQL |
| migrations/meta/0004_snapshot.json | json | Tracked Drizzle/PostgreSQL migration. | shared/schema.ts; PostgreSQL |
| migrations/meta/0005_snapshot.json | json | Tracked Drizzle/PostgreSQL migration. | shared/schema.ts; PostgreSQL |
| migrations/meta/0006_snapshot.json | json | Tracked Drizzle/PostgreSQL migration. | shared/schema.ts; PostgreSQL |
| migrations/meta/0008_snapshot.json | json | Tracked Drizzle/PostgreSQL migration. | shared/schema.ts; PostgreSQL |
| migrations/meta/_journal.json | json | Drizzle ordered migration journal/history: records the migration tags and order used to track schema evolution. | Read by Drizzle migration tooling; corresponds to tracked SQL/snapshot history and should not be treated as disposable output. |

## Appendix C — attached_assets (filename-only; every path listed)

Every row is a literal tracked filename. Contents were not inspected, especially sensitive-looking assets. These are reference-only and not assumed to be runtime dependencies.

| Path | Language/type | Purpose | Communication/dependencies |
|---|---|---|---|
| attached_assets/5417df0c-4d9a-47d5-8699-c68a6010f40b_1778535886395.jpeg | jpeg | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/AddSession_1762617311800.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/AiChatPanel_1769641689216.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/Analysis_Features_updates_22.04.26_1776866717185.docx | docx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/App (1)_1763726878109.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/App (2)_1763766348851.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/App_(1)_1768776292841.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/App_1762617138724.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/App_1763592873752.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/App_1766593750411.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/App_1768758257312.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/App_1769100661102.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/App_1770314330766.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/App_1776866862887.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/App_1777933234228.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/App_1788122928969.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/Assistant_Feature_Implementation_Requirements_1769641714970.docx | docx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/Attendance bug:change requirement 12.11.25_1762934968972.docx | docx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/AttendanceAnalysis_1776866895484.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/AuthKey_L92UYWKD84_1768660547189.p8 | p8 | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/AvailabilityCover_1777933195490.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/AvailabilityTab_1777933198769.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/Back end bugs 09.11.25_1762710102236.docx | docx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/Calendar_List:Table_view_desktop_30.08.26_1788101507174.docx | docx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/CollapsibleSidebar_1768776287829.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/CollapsibleSidebar_1769100654440.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/CollapsibleSidebar_1776866895483.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/CollapsibleSidebar_1788122914830.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/Competition functionality 17.11.25_1763465679134.docx | docx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/CompetitionDetail_1763465757840.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/CoverOpportunities_1777933222791.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/DayCalendarView (1)_1763465757840.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/DayCalendarView_1762617244643.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/DayListView_1762617244644.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/DayListView_1763465757840.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/Delete functionality 12.11.25_1762988674202.docx | docx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/Drills Library requirements 21.11.25_1763766486109.docx | docx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/DrillsLibrary_1763766416541.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/DrillsLibrary_1768758275378.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/DrillsSidebar_1763766437568.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/FeedbackAnalytics_1766593750412.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/FeedbackAnalytics_1768758281052.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/FeedbackForm_1766593750412.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/Feedback_Feature_1766593539864.docx | docx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/Front_end_upgrades_18.01.26_1768758249579.docx | docx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/GPT Testing 10.11.25_1762799032369.docx | docx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/GenerateSessions_1777933158856.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/Guidelines_1762617120708.md | md | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/H_1770996799501.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/Handbook_1770319657247.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/Handbook_1773615966074.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/Handbook_Document_Preview_requirements_1770319502455.docx | docx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/HomePage_1769100627754.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/Home_Dashboard_Implementation_Requirements_22.01.26_1769100608809.docx | docx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/IMG_7621_1764268559633.jpeg | jpeg | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/IMG_9092_1788209537711.PNG | PNG | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/Invoice Tracker requirements 19.11.25_1763592943267.docx | docx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/InvoiceTracker_1763592831896.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/InvoiceTracker_1768758283729.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/LoginPage_1763137878160.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/ManageCoaches_1762617379107.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/ManageCoaches_1768758261013.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/ManageCompetitions_1763465757840.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/ManageCompetitions_1768758271378.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/ManageLocations_1762617379108.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/ManageLocations_1768758266179.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/ManageSquads_1762617379108.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/ManageSquads_1768758263644.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/ManageSwimmers_1762617379108.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/ManageSwimmers_1763666848524.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/ManageSwimmers_1768758268495.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/ManageSwimmers_1773605436800.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/MonthCalendarView_1762617231646.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/MonthCalendarView_1763465757840.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/MonthCalendarView_1770314336787.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/Multi_Club_Changes_29.03.26_1774818737524.docx | docx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/Multiple_squads_per_session_1770834104261.docx | docx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/MyCoverRequests_1777933227259.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/NotesSection_1773615939950.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/NotesSidebar_1773615939952.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/Pasted--Canvas-app-Add-feedback-and-planning-documents-for-upc_1777994244501.txt | txt | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/Pasted--Canvas-app-Add-feedback-and-planning-documents-for-upc_1777994248938.txt | txt | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/Pasted--Warm-Up-Speed-Prep-900m-total-30-minutes-1-4-x-50m-fre_1769646178452.txt | txt | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/Pasted--workspace-psql-DATABASE-URL-psql-16-10-Type-help-for-h_1773608985918.txt | txt | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/Pasted-Hello-Thank-you-for-your-resubmission-but-we-need-addit_1775293249165.txt | txt | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/Pasted-Hi-team-Thanks-very-much-for-the-review-This-is-my-firs_1775219434624.txt | txt | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/Pasted-Main-Issues-in-Your-Replit-Code-1-Drills-Button-Positioning-CRITICAL-BUG-tsx-WRONG-Re-1763800021048_1763800021049.txt | txt | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/Pasted-Thanks-these-two-files-confirm-a-second-very-common-fai_1768733404649.txt | txt | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/Pasted-The-app-s-overall-design-database-tables-and-functionality-are-already-excellent-and-meet-expectat-1762382764674_1762382764676.txt | txt | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/Pasted-UPDATE-swimmers-SET-gender-female-WHERE-id-IN-052018f7-_1773608698456.txt | txt | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/Pasted-Warm-up-900m-Focus-Distance-per-stroke-reducing-stroke-_1769816392389.txt | txt | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/Pasted-You-are-my-security-GDPR-review-assistant-for-my-Replit_1771948768515.txt | txt | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/Pasted-import-Foundation-import-UserNotifications-import-UIKit_1768729183587.txt | txt | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/Pasted-import-SwiftUI-import-WebKit-import-Combine-class-WebVi_1768729146365.txt | txt | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/Pasted-import-SwiftUI-import-WebKit-import-Combine-class-WebVi_1775295969193.txt | txt | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/Pasted-import-UIKit-import-UserNotifications-class-AppDelegate_1768729200721.txt | txt | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/Payment_Method_Integration_30.03.26_1774892989730.docx | docx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/Phone_Notifications_Plan_17.01.26_1768655898916.docx | docx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/RichTextEditor_1762617311805.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/RichTextEditor_1763726948203.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/SS_(1)_1775861447050.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/SS_(1)_1775901551170.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/SS_1775901551170.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/ScheduleAlerts_1777933090099.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/ScheduleManager_1777933086683.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/Scheduling,_Availability_&_Cover_requirements_04.05.26_1777933286283.docx | docx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/Scheduling,_Availabilty_and_Cover_feedback_05.04.26_1777990426101.docx | docx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/Screenshot_2025-12-24_at_16.12.51_1766593340295.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/Screenshot_2025-12-24_at_16.15.45_1766593328079.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/Screenshot_2025-12-24_at_16.16.25_1766593348181.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/Screenshot_2025-12-24_at_16.16.42_1766593353392.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/Screenshot_2025-12-24_at_16.17.00_1766593361364.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/Screenshot_2025-12-24_at_16.17.29_1766593369708.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/Screenshot_2025-12-24_at_16.18.02_1766593385708.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/Scrolling errors 27.22.25_1764231888677.docx | docx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/Search, filter and bulk update swimmers 20.11.25_1763666871828.docx | docx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/SeasonPlannerSidebar_1788122880054.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/SeasonPlanner_1788122875243.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/Season_Planner_Requirements_for_Replit_30.08.26_1788122986068.docx | docx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/SessionDetail (1)_1763774084739.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/SessionDetail_1762617311795.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/SessionDetail_1763726920060.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/SessionDetail_1769641693787.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/SessionDetail_1773615966075.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/SessionDetail_1788122902101.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/SessionLibrary_1763726896958.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/SessionLibrary_1768758278038.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/SessionSearch_1770314333557.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/SessionWriterHelper_1766593750412.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/Session_Duplication_Functionality_12.02.26_1770922302911.docx | docx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/Session_Search_Feature_Implementation_Requirements_1770314325169.docx | docx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/Session_notes_and_handbook_notes_requirements_1773615870704.docx | docx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/Sessions Library requirements 21.11.25_1763726972464.docx | docx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/SquadOverviewGrid_1773605436800.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/StandardSchedule_1777933105181.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/SwiftNativeWrapper_Updated.swift | swift | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/SwimSquad_favicon_1774802085746.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/Swim_Squad_1771264189149.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/SwimmerProfilePage_1769100650539.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/SwimmerProfilePage_1776866895484.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/SwimmerProfiles_1769100646630.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/Swimmers_Grid_View_Requirements_1773605403247.docx | docx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/Swimming coaching app requirements_1761952585206.docx | docx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/badge_1769100672061.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/badge_1770319674669.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/button_1769100669012.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/button_1770319661804.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/card_1769100664460.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/card_1770319664149.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/dialog_1769100681395.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/dialog_1770319659318.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/globals_1762617078770.css | css | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/globals_1762617108027.css | css | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1761952985580.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762028914851.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762191533153.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762191644231.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762616881688.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762617603355.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762620418450.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762620442253.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762621502889.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762621525035.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762621603955.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762623335746.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762623352756.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762623373377.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762623390988.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762642966856.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762643537078.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762643569685.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762643678484.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762643780555.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762644355292.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762645101808.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762645125748.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762645143783.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762645615450.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762683155350.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762707058518.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762709847233.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762709864173.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762709928840.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762709935676.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762710018237.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762710024587.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762723076424.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762723205972.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762724710223.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762725307953.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762725447415.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762727306460.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762727388190.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762729773368.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762729854016.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762799003717.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762800190107.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762800226789.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762800261621.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762869851097.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762869867233.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762872151016.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762897721088.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762899648545.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762899687945.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762900702278.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762900918345.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762901438737.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762902154780.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762903019836.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762903384152.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762904835306.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762934929549.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762988615762.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762990847302.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762990991485.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762991805850.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762992076872.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1762992128526.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763074333181.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763074434882.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763137656819.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763137781662.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763142923633.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763159896752.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763160325968.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763160612717.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763160977603.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763201775556.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763201973985.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763202079067.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763403048193.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763465096292.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763465261889.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763465319406.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763465433567.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763465486521.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763465557339.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763465606219.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763474522762.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763474950270.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763474964879.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763476658280.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763476677355.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763476876555.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763479934724.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763482062396.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763482351272.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763485590571.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763485817953.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763486051984.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763486071199.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763589602775.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763589755318.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763591886549.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763591961655.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763594690710.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763594709915.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763595496990.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763666483237.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763666523042.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763666557172.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763666611135.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763666751998.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763666759291.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763666767395.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763666772810.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763667872856.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763668195382.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763724439878.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763724625209.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763724793776.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763724936526.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763725060394.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763725876261.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763726025369.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763726108165.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763766114618.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763766139969.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763766181111.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763766213597.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763766242910.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763766272133.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763772672267.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763773278715.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763773734909.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763774050210.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763774067521.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763774539425.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763905059497.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1763921160329.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1764090800196.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1764091046577.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1764148955151.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1764149008836.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1766592717980.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1766592759548.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1766592778969.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1766592953402.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1766592966707.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1766592991891.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1766593008701.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1766593027517.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1766593419627.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1766593446174.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1766593466852.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1766593492115.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1766593516886.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1766594683820.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1766599314605.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1766601919718.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1766604731094.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1766604756505.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1766605632769.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1766610916374.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1766611236882.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1768655836611.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1768659871280.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1768659895354.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1768661263186.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1768661472690.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1768662983897.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1768663004850.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1768663046963.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1768664754068.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1768666810097.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1768667030704.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1768667802839.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1768667938241.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1768670104938.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1768693420470.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1768727239903.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1768727335487.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1768759083878.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1768776322671.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1768776346351.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1769103478923.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1769108843927.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1769645037960.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1769645237796.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1769645446045.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1769645467042.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1769691825439.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1769816198314.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1770321281955.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1770321534796.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1770330430443.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1770331472248.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1770840810563.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1770841957823.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1770849388169.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1770850541184.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1770851607909.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1770926485922.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1770926647211.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1770926664110.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1770997781634.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1770998274510.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1773606965982.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1773616875820.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1773618010403.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1773618081106.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1773703865713.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1773703890737.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1773704535262.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1773704892924.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1774909894833.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1774909943784.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1774909979933.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1774958790983.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1775052484203.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1775052651951.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1775053353558.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1775053438291.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1775055482955.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1775055538600.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1775059731746.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1775061077499.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1775061113147.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1775065988793.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1775215737388.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1775215891437.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1775217448117.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1775217788940.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1775217915258.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1775295711065.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1775636873210.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1776805159161.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1776891127272.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1776891147591.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1777543770880.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1777990361679.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1778015285904.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1778015310047.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1778015323290.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1778015914937.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1778016236250.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1778022167192.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1781197504404.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1784712360814.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1784967686677.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1784967781581.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1787674306939.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1787853438516.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1787853988374.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1788101354442.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1788101370774.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1788101435858.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1788101447847.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1788127789464.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1788127852289.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1788127920343.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1788127942468.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1788127991248.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1788128007066.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1788209881971.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1788992728250.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1788993009328.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1789053123542.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1789054058210.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1789054996773.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1789055049451.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1789055144257.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1789079793729.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1789203114936.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1789206450349.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1789206553496.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1789206634305.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/image_1789206651151.png | png | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/index_1762617130471.ts | ts | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/index_1773616030740.ts | ts | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/index_1777933251493.css | css | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/index_1788122970874.ts | ts | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/input_1770319666596.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/label_1770319682852.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/mockDataExtensions_1788122965125.ts | ts | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/mockData_1788122957221.ts | ts | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/select_1769100676121.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/select_1770319670744.tsx | tsx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/set writing requirements_1762382906003.docx | docx | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
| attached_assets/utils_1770319687556.ts | ts | Uploaded reference/snapshot; contents not inspected. | Reference only; no runtime dependency asserted |
