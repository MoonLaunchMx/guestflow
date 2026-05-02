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

**Anfiora** is a Next.js 16 (App Router) + React 19 + TypeScript event management platform. It helps organizers manage guest lists, collect RSVPs via WhatsApp (with Claude AI interpretation), run collaborative photo albums and playlists, handle seating charts, food planning, and event timelines.

## Stack (no cambiar)

- **Frontend:** Next.js 16 App Router + TypeScript + Tailwind CSS v4
- **Backend/DB:** Supabase (auth + postgres, free tier, región Oregon)
- **Deploy:** Vercel (auto-deploy desde `main`)
- **WhatsApp:** 360dialog (WhatsApp Business API) — activo en webhook
- **AI:** Claude Haiku (`claude-haiku-4-5-20251001`) — activo en `lib/ai-rsvp.ts`
- **Analytics:** PostHog (`app/components/PostHogProvider.tsx`)
- **Animaciones:** Framer Motion
- **Drag and drop:** @dnd-kit/core + @dnd-kit/sortable + @dnd-kit/utilities
- **Spotify:** Spotify Web API (Client Credentials) — búsqueda y preview de canciones

## Routing Structure

Uses **Next.js App Router** exclusively. Most page components are `'use client'`. Key routes:

- `/landing` — public marketing page (bilingual es/en)
- `/dashboard` — authenticated user dashboard
- `/events/[id]/` — guest list
- `/events/[id]/album` — collaborative photo album (QR-based)
- `/events/[id]/mesas` — seating chart
- `/events/[id]/playlist` — collaborative playlist
- `/events/[id]/comida` — food/shopping planner
- `/events/[id]/timeline` — tasks and reminders
- `/events/[id]/configuracion` — event settings
- `/admin` — admin panel
- `/api/webhook/whatsapp` — POST endpoint for 360Dialog WhatsApp messages
- `/api/spotify/search` — GET Spotify song search (Client Credentials)
- `/api/webhook/test` — POST simulate WhatsApp messages (dev only)
- `/api/debug` — GET check env vars (dev only)

## Nav items — sidebar desktop + bottom nav mobile

| Label | Ruta |
|---|---|
| Invitados | /events/[id] |
| Mesas | /events/[id]/mesas |
| Comida | /events/[id]/comida |
| Timeline | /events/[id]/timeline |
| Álbum | /events/[id]/album |
| Playlist | /events/[id]/playlist |
| Configuración | /events/[id]/configuracion |

Sidebar desktop colapsable (iconos en modo colapsado, texto completo al expandir). Bottom nav mobile con scroll horizontal snap.

## Data Layer

**Supabase** (PostgreSQL) for all persistence and auth. Two clients:
- `lib/supabase.ts` — browser client using `NEXT_PUBLIC_SUPABASE_*` keys
- API routes use `SUPABASE_SERVICE_ROLE_KEY` for privileged operations

All TypeScript types are defined in `lib/types.ts`. Check there first before querying Supabase.

## Schema Supabase (9 tablas — no agregar más en MVP)

```sql
-- users: perfiles de planners
users (id, email, full_name, plan)
-- plan: 'free' | 'pro' | 'agency'

-- events: eventos/bodas
events (
  id, user_id, name, event_date, event_end_date, event_time,
  venue, address, event_type, total_guests,
  guest_tags ARRAY,
  event_status TEXT   -- 'active' | 'paused' | 'cancelled' | 'completed'
)

-- event_settings: configuración separada del evento (1-a-1 con events)
event_settings (
  id, event_id,
  message_templates JSONB,
  template_names JSONB,
  album_url TEXT,
  playlist_token TEXT,
  playlist_categories JSONB   -- "etapas" en UI
)

-- guests: invitados
guests (
  id, event_id, name, phone, email, party_size, notes,
  rsvp_status TEXT,
  tags JSONB,
  side TEXT,
  allergies JSONB,
  checked_in BOOLEAN
)

-- party_members: acompañantes de cada invitado
party_members (
  id, guest_id, event_id, name, phone,
  rsvp_status TEXT,
  checked_in BOOLEAN,
  created_at
)

-- wa_messages: historial WhatsApp
wa_messages (id, guest_id, event_id, direction, content, created_at)

-- song_recommendations: playlist feature
song_recommendations (
  id, event_id, guest_id, guest_name, song_title, artist,
  spotify_url, category, position, notes, created_at,
  thumbnail TEXT,
  preview_url TEXT,
  duration_ms INTEGER
)

-- tables: mesas del evento
tables (id, event_id, number, name, capacity, shape TEXT, position_x, position_y, created_at)

-- table_seats: asignación invitado ↔ mesa
table_seats (id, table_id, event_id, seat_number, guest_id, party_size, created_at)

-- timeline_tasks: tareas y recordatorios del evento
timeline_tasks (
  id, event_id, title, emoji, category,
  task_date, task_time, notes,
  is_highlighted, is_completed,
  reminder_date, created_at
)
```

### RsvpStatus (6 valores — todos deben estar en STATUS_LABEL/STATUS_COLORS)

```ts
'pending' | 'confirmed' | 'declined' | 'mensaje_enviado' | 'respondio' | 'accion_necesaria'
```

**CRÍTICO:** Cada página que renderiza `rsvp_status` debe tener los 6 valores en su objeto de estilos.

### EventStatus (4 valores)

```ts
'active' | 'paused' | 'cancelled' | 'completed'
```

### FoodCategory / FoodItem (tipos para comida)

```ts
FoodCategory { id, name, emoji, items: FoodItem[] }
FoodItem { name, amountPerPerson, unit: 'g'|'kg'|'pz'|'L'|'ml' }
```

## Funciones RPC en Supabase

```sql
increment_guests(event_id_input UUID)
decrement_guests(event_id_input UUID)
increment_guests_by(event_id_input UUID, amount INT)
```

## Estructura de archivos actual

```
app/
├── page.tsx
├── layout.tsx
├── globals.css                         → design tokens + @font-face
├── manifest.ts
├── landing/page.tsx
├── dashboard/page.tsx
├── mensajes/page.tsx
├── admin/page.tsx
├── playlist/[token]/page.tsx           → página pública para invitados (sin login)
├── api/
│   ├── webhook/whatsapp/route.ts
│   ├── webhook/test/route.ts           → simula mensajes WhatsApp (solo dev)
│   ├── debug/route.ts                  → verifica env vars (solo dev)
│   └── spotify/search/route.ts
├── events/
│   ├── new/page.tsx
│   └── [id]/
│       ├── layout.tsx
│       ├── page.tsx
│       ├── album/page.tsx
│       ├── comida/page.tsx             → planificador de comida/compras
│       ├── mesas/page.tsx
│       ├── timeline/page.tsx
│       ├── configuracion/page.tsx
│       └── playlist/page.tsx
└── components/
    ├── WhatsAppFAB.tsx
    ├── PostHogProvider.tsx             → analytics
    └── auth/AuthModal.tsx

lib/
├── supabase.ts
├── ai-rsvp.ts
└── types.ts

public/
├── fonts/                             → Josefin Sans, Satoshi Variable, General Sans Variable
├── images/                            → logo.png, logo.svg, isotipo.png, isotipo.svg, logo-banner.png
└── icons/                             → icon-192.png, icon-512.png (PWA)
```

## Styling

**Tailwind CSS v4** (via `@tailwindcss/postcss`). Design tokens en `app/globals.css`:

```css
--bg:           #ffffff;
--surface:      #f8f8f8;
--surface-alt:  #f2f2f2;
--hover:        #eeeeee;
--border:       #e8e8e8;
--border-strong:#e0e0e0;
--text:         #0a0a0a;
--text-sec:     #666666;
--text-muted:   #999999;
--text-dim:     #bbbbbb;
--accent:       #d4a853;   /* gold */
--accent-dim:   #c49a3a;
--accent-bg:    #fffbf0;
--nav-active:   #f0f0f0;
--error-bg:     #fff0f0;
--error-border: #ffc0c0;
--error-text:   #cc3333;
--success-bg:   #f0fff6;
--success-border:#a0e0c0;
--success-text: #2a7a50;
```

**Nota:** `--teal` (#48C9B0) se usa en UI como color de botones CTA pero no está declarado como var CSS — usar `#48C9B0` directamente o clase Tailwind cuando aplique.

**Fuentes:**
- `General Sans` (variable 200-700) — fuente principal del sistema
- `Satoshi` (variable 300-900) — fuente display
- `Josefin Sans` (600/700) — hero de playlist pública y branding Anfiora
- Usar con `style={{ fontFamily: "'Josefin Sans', sans-serif" }}` — no disponible como clase Tailwind

## AI Integration

`lib/ai-rsvp.ts` calls **Claude** (`claude-haiku-4-5-20251001`) to interpret incoming WhatsApp messages and infer guest RSVP intent. The webhook at `/api/webhook/whatsapp` orchestrates: receive message → parse → AI interpretation → update `guests` table.

## Auth Pattern

Supabase email/password auth via `AuthModal` component. Session stored client-side (localStorage, NOT cookies). Middleware (`middleware.ts`) passes all requests through — auth checks happen inside page components via `supabase.auth.getUser()`.

## Key Third-Party Services

| Service | Purpose | Env var prefix |
|---|---|---|
| Supabase | DB + Auth | `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY` |
| Anthropic | RSVP AI | `ANTHROPIC_API_KEY` |
| 360Dialog | WhatsApp Business API | `DIALOG_360_*` |
| PostHog | Analytics | `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` |
| Spotify | Song search + preview | `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` |

## Contexto técnico importante

- **event_settings vs events:** `message_templates`, `template_names`, `playlist_token`, `playlist_categories`, `album_url` viven en `event_settings`, NO en `events`.
- **Dos clientes Supabase:** `lib/supabase.ts` (browser) y `SUPABASE_SERVICE_ROLE_KEY` solo en API routes.
- **Spotify API:** Client Credentials (sin OAuth). Preview de audio bloqueado por CORS en localhost — funciona solo en producción con HTTPS.
- **CSV encoding:** leer con UTF-8 primero; si hay `�`, releer con `windows-1252`. Excel en México guarda en Windows-1252.
- **Batch insert:** `supabase.from('guests').insert(arrayCompleto)` — nunca loop de inserts individuales.
- **Playlist límite 3 canciones:** localStorage (UX) + conteo por `guest_name` en DB (validación real).
- **Drag and drop playlist:** @dnd-kit con `PointerSensor` (distance: 5) y `TouchSensor` (delay: 200).
- **`import { QRCodeCanvas } from 'qrcode.react'`** — named import, no default.
- **Terminal:** Diego usa VS Code con PowerShell en Windows. Evitar caracteres especiales en git commits.
- **Commits:** convencionales — `feat:`, `fix:`, `refactor:` — sin acentos ni ñ.

## i18n

Spanish (`es`) and English (`en`) supported on landing page and auth modal via local state toggle. No external i18n library.

## Diseño y UI/UX

**Actúa siempre como product owner y diseñador UI/UX con 20+ años de experiencia en aplicaciones web responsivas, priorizando simplicidad y efectividad.**

- **Estilo:** flat, limpio, inspirado en Airtable/Notion
- **Solo Tailwind CSS** — no inline styles salvo excepciones justificadas
- **Mobile first** — cards en mobile, tabla en desktop
- **Framer Motion** para animaciones
- **Botones CTA:** siempre en teal `#48C9B0`
- **Negro `#1D1E20`** exclusivamente para dropdowns de filtro
- **Lucide React** para íconos — no SVGs manuales (excepción: play/pause en playlist)
- **Idioma UI:** español

## Reglas de código

1. **Código completo** — nunca fragmentos, siempre el archivo entero listo para pegar
2. **Un paso a la vez** — terminar y confirmar antes de proponer el siguiente
3. **Full file replacement** — nunca edits parciales
4. **Sin tablas nuevas** en Supabase durante MVP
5. **Sin OAuth, sin Stripe, sin tests** durante MVP
6. **Sin comentarios** salvo cuando el WHY es no-obvio

## Reglas para Claude Code (terminal)

**Claude Code debe SIEMPRE:**
1. Preguntar antes de ejecutar cualquier comando que modifique archivos, instale paquetes, o cambie configuración
2. Mostrar el plan completo antes de empezar
3. Esperar confirmación explícita antes de proceder
4. Un cambio a la vez
5. Nunca modificar la DB de Supabase directamente

**Claude Code NUNCA debe:**
- Ejecutar `git push` sin permiso explícito
- Instalar paquetes sin preguntar
- Modificar `lib/types.ts` sin confirmar compatibilidad con todas las páginas que usan ese tipo
- Hacer cambios en Supabase (schema, datos, RLS) sin instrucción directa

## Regla crítica: sincronía Supabase ↔ Vercel

Supabase (DB + datos) se actualiza en vivo. Vercel (código) solo se actualiza con `git push origin main`.

**Nunca modificar datos o schema en Supabase sin tener el código correspondiente ya pusheado.**

Checklist antes de cualquier cambio en Supabase:
1. ¿El código ya está en `origin/main`? Si no → pushear primero
2. ¿Todos los `STATUS_LABEL` / `STATUS_COLORS` tienen el nuevo valor? Si no → actualizar primero
3. ¿`lib/types.ts` está actualizado y no rompe nada?

## Features completados

- **Auth:** email/password Supabase. Auth por página con `supabase.auth.getUser()`.
- **Dashboard:** métricas globales, tarjeta próximo evento, lista eventos con progress bar.
- **Guest List:** tabla desktop / cards mobile. Bulk actions. Modal agregar/editar. CSV import/export. Dropdown WA con plantillas. Tags. Side. Alergias. Acompañantes (party_members).
- **Party members:** filas satélite con línea conectora y color de grupo. RSVP individual. Hasta 15 por invitado.
- **Mesas:** crear/editar/eliminar. Bulk create. Asignar/mover invitados. Check-in. Vista cards y lista. Imprimir lista en PDF.
- **Comida:** planificador de compras por categoría. Soporte multi-día. 4 niveles de intensidad. Tabs desayuno/comida/cena. Compartir por WhatsApp. Split view desktop.
- **Timeline:** tareas y recordatorios por etapa. Categorías con emoji.
- **Album:** instrucciones + QR con `qrcode.react`.
- **Playlist (planner):** lista global con drag and drop. Etapas como badges. Filtro por etapa. Preview audio 30 seg. Notas inline. Botón Spotify. Copiar link.
- **Playlist (pública):** hero negro sticky con Josefin Sans. Búsqueda Spotify. Preview 30 seg. Límite 3 canciones (localStorage + DB). Lista con thumbnails.
- **Mensajes (WhatsApp Hub):** historial por invitado. Bandeja + chat. Desktop dos columnas, mobile push nav.
- **Webhook WhatsApp:** 360dialog → Claude Haiku → Supabase.
- **Landing page:** pública, responsive, bilingüe es/en.
- **PWA:** manifest + iconos. Instalable en mobile.
- **Admin:** métricas de todos los usuarios, gestión de planes.
- **CSV import:** batch insert, encoding UTF-8/Windows-1252, detección duplicados.
- **CSV export:** incluye acompañantes separados por `|`.
- **Analytics:** PostHog integrado via `PostHogProvider`.

## Planes (MXN)

| Plan | Precio | WhatsApp | IA |
|---|---|---|---|
| Free | $0 | wa.me manual | — |
| Pro | $1,990/mes | Número compartido GuestFlow | RSVP AI |
| Agency | $3,990–$4,990/mes | Número dedicado | RSVP AI |

Columna `plan` en `users`. Cambio manual en Supabase hasta tener Stripe. Sin modularidad hasta tener clientes pagando.
