# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server on http://localhost:3000
npm run build    # Production build
npm run lint     # Run ESLint
```

No test suite is configured.

## Architecture Overview

**GuestFlow** is a Next.js 16 (App Router) + React 19 + TypeScript event management platform. It helps organizers manage guest lists, collect RSVPs via WhatsApp (with Claude AI interpretation), run collaborative photo albums and playlists, handle seating charts, food planning, and event timelines.

### Routing Structure

Uses **Next.js App Router** exclusively. Most page components are `'use client'`. Key routes:

- `/landing` — public marketing page (bilingual es/en)
- `/dashboard` — authenticated user dashboard
- `/events/[id]/` — guest list
- `/events/[id]/album` — collaborative photo album (QR-based)
- `/events/[id]/mesas` — seating chart
- `/events/[id]/playlist` — collaborative playlist
- `/events/[id]/comida` — food planning
- `/events/[id]/timeline` — tasks and reminders
- `/events/[id]/configuracion` — event settings
- `/admin` — admin panel
- `/api/webhook/whatsapp` — POST endpoint for 360Dialog WhatsApp messages

### Data Layer

**Supabase** (PostgreSQL) for all persistence and auth. Two clients:
- `lib/supabase.ts` — browser client using `NEXT_PUBLIC_SUPABASE_*` keys
- API routes use `SUPABASE_SERVICE_ROLE_KEY` for privileged operations

Core tables: `events`, `event_settings`, `guests`, `party_members`, `wa_messages`, `tables`, `table_seats`, `timeline_tasks`, `song_recommendations`.

All TypeScript types are defined in `lib/types.ts`. Check there first before querying Supabase to understand shape and enums (e.g., `RsvpStatus`, `EventStatus`, `MessageDirection`).

### AI Integration

`lib/ai-rsvp.ts` calls **Claude** (`claude-haiku-4-5-20251001`) to interpret incoming WhatsApp messages and infer guest RSVP intent. The webhook at `/api/webhook/whatsapp` orchestrates: receive message → parse → AI interpretation → update `guests` table.

### Styling

**Tailwind CSS v4** (via `@tailwindcss/postcss`). Design tokens (CSS variables) are defined in `app/globals.css` — use these instead of hardcoded colors. Key tokens: `--bg`, `--surface`, `--border`, `--text`, `--accent` (gold `#d4a853`), `--teal` (`#48C9B0`). Responsive design is mobile-first.

**Framer Motion** is used for animations throughout.

### Key Third-Party Services

| Service | Purpose | Env var prefix |
|---|---|---|
| Supabase | DB + Auth | `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY` |
| Anthropic | RSVP AI | `ANTHROPIC_API_KEY` |
| 360Dialog | WhatsApp Business API | `DIALOG_360_*` |
| PostHog | Analytics | `NEXT_PUBLIC_POSTHOG_*` |

### Auth Pattern

Supabase email/password auth via `AuthModal` component (`app/components/auth/AuthModal.tsx`). Session is stored client-side. Middleware (`middleware.ts`) currently passes all requests through — auth checks happen inside page components.

### i18n

Spanish (`es`) and English (`en`) are supported. The landing page and auth modal handle language via a local state toggle. No external i18n library — translations are inline objects in each component.
