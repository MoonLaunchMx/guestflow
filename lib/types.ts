export type RsvpStatus = 'pending' | 'confirmed' | 'declined'

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
  party_members: PartyMember[]
}