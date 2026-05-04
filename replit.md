# SwimCoach - Session Logging Platform

## Overview
SwimCoach is a professional swimming coaching session logging platform designed for poolside use on tablets and mobile devices. Its primary purpose is to enable coaches to record training sessions, manage competitions, track attendance, manage squads, and analyze performance data. The platform prioritizes efficiency and usability in wet environments through a mobile-first approach with generous touch targets and a clear visual hierarchy. Key capabilities include comprehensive competition management, integrated session and competition calendars, and a robust session library for template management and reuse. The business vision is to provide a reliable, feature-rich tool that enhances coaching effectiveness and streamlines administrative tasks, offering significant market potential in the athletic coaching sector.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend is built with React and TypeScript, using Vite for bundling and Wouter for routing. The UI/UX leverages shadcn/ui (New York style) based on Radix UI primitives, styled with Tailwind CSS and custom HSL-based CSS variables, featuring the Inter font and a mobile-first responsive design. State management is handled by TanStack Query for server state, React Hook Form with Zod for form validation, and React context for authentication.
Core features include:
- **Session & Competition Calendar**: Displays sessions and competitions with distinct visual cues.
- **Session Detail View**: A three-tab interface for metadata, rich-text content with a distance breakdown sidebar, and attendance. Includes a "Duplicate Session" feature for copying session details.
- **Competition Management**: Admin-only functionality to create, edit, and delete competitions, including coach assignments.
- **Attendance Register**: Manages swimmer attendance with status and notes, enforcing business rules.
- **Session Library**: A template management system for creating, editing, storing, and reusing session content.
- **Drills Library**: A comprehensive drill management system with stroke-based filtering, real-time search, YouTube video embedding, and full CRUD operations.
- **Handbook**: Document management system and coaching notes, with two tabs for DB-backed document storage and squad-linked coaching notes.
- **Intelligent Drill Detection**: AI-powered feature that automatically detects drills mentioned in training session content using GPT-4o-mini.
- **Squad Grid View**: A web-only view mode on the Manage Swimmers page displaying swimmers organized by squad and age group, featuring drag-and-drop reordering.
- **Feedback System**: A three-part system including a feedback form, an analytics dashboard with AI-powered pattern detection, and a session writer helper providing data-driven and AI-powered recommendations for session planning.
- **Scheduling, Availability & Cover**: A three-phase system for managing coach availability, cover requests, and session generation. This includes an "Availability & Cover" page for logging absences and managing cover, and a "Schedule Manager" (admin-only) for creating recurring session templates, generating sessions, and managing alerts for sessions needing cover.

### Backend
The backend uses Node.js with Express.js and TypeScript, providing a RESTful API with JSON responses. Drizzle ORM is used for type-safe PostgreSQL operations. AI integration is provided by GPT-4o-mini via Replit AI for automated distance extraction, intelligent drill detection, feedback analytics insights, and session planning recommendations. Session management uses Express sessions with a PostgreSQL store and secure HTTP-only cookies. Authentication is admin-controlled Email/Password based, featuring bcrypt hashing, crypto-secure tokens, Resend email integration, and role-based access control. A soft delete system (`record_status`) is implemented across core entities.

### Database
The system utilizes a PostgreSQL database hosted on Neon Serverless, with Drizzle ORM. The schema includes core entities such as `users`, `coaches`, `squads`, `swimmers`, `locations`, `swimming_sessions`, `session_squads`, `attendance`, `competitions`, `competition_coaching`, `session_templates`, and `drills`. Multi-squad sessions are supported via a `session_squads` junction table. Soft deletes are implemented using a `record_status` column. Session duplication is tracked via `duplicated_from_session_id`.

### Authentication & Authorization
The authentication system is a production-ready, standalone Email/Password authentication with an admin-controlled invitation flow, eliminating external OAuth dependencies. It features a single-email invitation process, bcrypt hashing, crypto-secure tokens, atomic database transactions, and role-based access control with `requireAdmin` middleware.

### Stripe Billing (SaaS Subscription)
The platform uses Stripe for club subscription billing, including registration flow, graduated GBP pricing tiers, subscription quantity synchronization, a billing admin UI, and integration with the Stripe Customer Portal. Webhooks are used for real-time updates.

### Native App Platform Restrictions
To comply with Apple guideline 3.1.3(b), payment-related features are hidden when the app is running inside an iOS or Android native WebView wrapper. Detection is handled via `window.isNativeApp` or a `?native=true` URL parameter.

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