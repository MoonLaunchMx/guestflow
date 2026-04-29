// ─── RSVP ────────────────────────────────────────────────────────────────────

export type RsvpStatus = 'pending' | 'confirmed' | 'declined' | 'mensaje_enviado' | 'respondio' | 'accion_necesaria'

// ─── EVENT ───────────────────────────────────────────────────────────────────

export type EventStatus = 'active' | 'paused' | 'cancelled' | 'completed'

export type Event = {
  id: string
  user_id: string
  name: string
  event_date: string | null
  event_end_date: string | null
  event_time: string | null
  event_type: string | null
  event_status: EventStatus
  venue: string | null
  address: string | null
  total_guests: number
  guest_tags: string[]
  created_at: string
}

export type EventSettings = {
  id: string
  event_id: string
  message_templates: string[] | null
  template_names: string[] | null
  album_url: string | null
  playlist_token: string | null
  playlist_categories: string[] | null
  created_at: string
  updated_at: string
}

// ─── GUESTS ──────────────────────────────────────────────────────────────────

export type PartyMember = {
  id: string
  guest_id: string
  event_id: string
  name: string
  phone?: string | null
  rsvp_status: RsvpStatus
  created_at?: string
}

export type Guest = {
  id: string
  event_id: string
  name: string
  phone: string | null
  email?: string | null
  party_size: number
  notes?: string | null
  rsvp_status: RsvpStatus
  tags: string[]
  party_members: PartyMember[]
}

// ─── MESSAGES ────────────────────────────────────────────────────────────────

export type MessageDirection = 'sent' | 'received'

export type WaMessage = {
  id: string
  guest_id: string
  event_id: string
  direction: MessageDirection
  content: string
  created_at: string
}

// ─── FOOD PLANNER ────────────────────────────────────────────────────────────

export type FoodCategory = {
  id: string
  name: string
  emoji: string
  items: FoodItem[]
}

export type FoodItem = {
  id: string
  name: string
  amountPerPerson: number
  unit: 'g' | 'kg' | 'pz' | 'L' | 'ml'
  custom?: boolean
}

// ─── SEATING ─────────────────────────────────────────────────────────────────

export type TableShape = 'round' | 'rectangle'

export type Table = {
  id: string
  event_id: string
  number: number
  name: string | null
  capacity: number
  shape: TableShape
  position_x: number
  position_y: number
  created_at: string
  // computed client-side
  seats?: TableSeat[]
}

export type TableSeat = {
  id: string
  table_id: string
  event_id: string
  seat_number: number
  guest_id: string | null
  created_at: string
  // joined client-side
  guest?: Pick<Guest, 'id' | 'name' | 'rsvp_status'>
}

export type TimelineTask = {
  id: string
  event_id: string
  title: string
  emoji: string | null
  category: 'evento' | 'tarea' | 'recordatorio' | 'reunion' | 'entrega' | 'pago' | 'comunicacion' | 'otro'
  task_date: string
  task_time: string | null
  notes: string | null
  is_highlighted: boolean
  is_completed: boolean
  reminder_date: string | null
  created_at: string
}