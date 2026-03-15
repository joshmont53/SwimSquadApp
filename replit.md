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
- **Session Detail View**: A three-tab interface for metadata, rich-text content with a distance breakdown sidebar, and attendance. Includes a **Duplicate Session** feature that allows coaches to copy all session details (content, distances, coaches, location, focus) to different squads. Duplicated sessions are tracked via `duplicatedFromSessionId` and are zero-rated for session writing in the invoice tracker (shown with "Duplicate" badge and £0.00).
- **Competition Management**: Admin-only functionality to create, edit, and delete competitions, including coach assignments with time blocks.
- **Attendance Register**: Manages swimmer attendance with status and notes, enforcing business rules.
- **Session Library**: A template management system allowing coaches to create, edit, store, and reuse session content, integrated with the session editor.
- **Drills Library**: A comprehensive drill management system with stroke-based filtering (Freestyle, Backstroke, Breaststroke, Butterfly, Starts, Turns), real-time search, YouTube video embedding, and full CRUD operations. Features color-coded badges, permission-based edit/delete controls, and responsive card layout.
- **Handbook**: Document management system for coaches to upload, categorize, preview, and download documents (PDF, Word, Excel). Documents are stored in localStorage as base64-encoded data. Features include:
  - Drag-and-drop upload with file type validation
  - 6 document categories (Session Plans, Competition Calendars, Training Programs, Meet Results, Meeting Notes, Other)
  - Search and filter functionality by name and category
  - Full document preview: PDF (iframe with loading state), Excel (xlsx library with multi-sheet support), Word (mammoth library converting to HTML)
  - Delete confirmation dialogs and download capability
  - File type badges in preview dialog header
  - Navigation available in both desktop and mobile sidebars under the MY TOOLS section
- **Intelligent Drill Detection**: AI-powered feature that automatically detects drills mentioned in training session content using GPT-4o-mini. Detected drills are displayed in a dedicated sidebar (accessed via Play button) with expandable cards showing full drill details and embedded videos. The drills sidebar button is positioned inside the session content container using absolute positioning (`right-0`), stacked directly below the distance breakdown button when present. Both buttons shift left together when the distance sidebar opens to remain accessible. Includes fallback case-insensitive substring matching for reliability.
- **Squad Grid View**: A new view mode on the Manage Swimmers page (web-only, hidden on mobile). Toggled via "List View" / "Grid View" buttons in the header. Displays swimmers organised in a matrix by squad (rows) × age group columns (8-, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18+). Each cell shows individual swimmer name chips. Age is calculated as at December 31 of the current year. Features: sticky header/count/squad-name columns, drag-and-drop row/column reordering via `react-dnd`, show/hide squads and age groups via popover checkboxes. Component: `client/src/pages/squad-overview-grid.tsx`.
- **Feedback System**: Comprehensive three-part feedback system:
  - **Feedback Form**: Coaches can rate sessions across 6 categories (Engagement, Difficulty, Technique Focus, Energy Levels, Session Flow, Overall Effectiveness) on a 1-5 scale, with optional notes and privacy settings. Accessible via feedback icon on session cards.
  - **Feedback Analytics Dashboard**: Displays aggregated feedback data with trend charts, category breakdowns, stroke/discipline analysis, and AI-powered pattern detection using GPT-4o-mini. Features coach performance comparisons and hidden correlation discovery.
  - **Session Writer Helper**: A slide-out sidebar panel accessible from the session editor (Lightbulb icon) that provides data-driven insights for planning sessions. Features two content layers: (1) Non-AI content showing squad context, recent feedback averages with 2-column grid layout, trend indicators, and highest/lowest category highlights; (2) AI-powered actionable recommendations generated by GPT-4o-mini including "What's Working", "Areas to Address", and focus-specific tips. AI insights are cached per squad/focus combination and persist while the session is being edited, with manual refresh option. Uses smart fallback to all squad data when fewer than 3 focus-specific sessions are available. Requires minimum 3 sessions with feedback to generate AI insights.

### Backend
The backend uses Node.js with Express.js and TypeScript, providing a RESTful API with JSON responses. Drizzle ORM is used for type-safe PostgreSQL operations, abstracted via a storage interface. AI integration is provided by GPT-4o-mini via Replit AI for automated distance extraction, intelligent drill detection, feedback analytics insights, and session planning recommendations, with rule-based parser fallbacks for reliability. Session management uses Express sessions with a PostgreSQL store and secure HTTP-only cookies. Authentication is admin-controlled Email/Password based, featuring bcrypt hashing, crypto-secure tokens, Resend email integration, and role-based access control. A soft delete system (`record_status`) is implemented across core entities for data preservation.

### Database
The system utilizes a PostgreSQL database hosted on Neon Serverless, with Drizzle ORM for type-safe interactions. The schema includes core entities such as `users`, `coaches`, `squads`, `swimmers`, `locations`, `swimming_sessions`, `session_squads`, `attendance`, `competitions`, `competition_coaching`, `session_templates`, and `drills`. Relationships are comprehensive, linking various entities. The data model uses UUID primary keys, timestamp tracking, detailed stroke/distance tracking, template content storage (both plain text and rich HTML), drill metadata (name, stroke type, description, video URL), and AI-detected drill associations (`detected_drill_ids` array in sessions). Soft deletes are implemented using a `record_status` column across all core entities. Session duplication is tracked via `duplicated_from_session_id` (nullable varchar) on `swimming_sessions`, linking duplicated sessions to their source for audit trail and invoice zero-rating.
- **Multi-Squad Sessions (Phase 5 Complete)**: The `session_squads` junction table enables many-to-many relationships between sessions and squads. The existing `swimming_sessions.squadId` column is preserved as the primary squad for backward compatibility. The `session_squads` table has a unique constraint on (session_id, squad_id) and uses `record_status` for soft deletes (audit trail). All 6 phases are complete: Phase 1 (database table), Phase 2 (session creation UI + attendance with squad subheadings), Phase 3 (calendar display with gradient backgrounds), Phase 4 (edit session with multi-squad selector), Phase 5 (analytics - all 5 feedback/analytics endpoints and 2 AI assistant endpoints updated to use session_squads junction table), Phase 6 (invoice - squad names resolved via session_squads for coaching sessions and sessions written).

### Authentication & Authorization
The authentication system is a production-ready, standalone Email/Password authentication with an admin-controlled invitation flow, eliminating external OAuth dependencies. It features a single-email invitation process where the token proves email ownership. Key security features include bcrypt hashing, crypto-secure tokens, atomic database transactions, and role-based access control with `requireAdmin` middleware. The system supports a robust invitation flow from admin creation to coach registration and login, with comprehensive error handling and recovery mechanisms.

## External Dependencies

### Third-Party Services
-   **Database Hosting**: Neon Serverless PostgreSQL
-   **Font Delivery**: Google Fonts CDN
-   **AI Integration**: Replit AI (GPT-4o-mini)
-   **Email Service**: Resend API

### Key NPM Packages
-   **Frontend**: `react`, `react-dom`, `wouter`, `@tanstack/react-query`, `react-hook-form`, `zod`, `@radix-ui/*`, `tailwindcss`, `class-variance-authority`, `lucide-react`, `react-dnd`, `react-dnd-html5-backend`.
-   **Backend**: `express`, `drizzle-orm`, `@neondatabase/serverless`, `express-session`, `connect-pg-simple`, `bcrypt`.