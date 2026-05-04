import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const ADMIN_EMAIL = 'diego.garza@moonlaunch.mx'

export async function GET(req: NextRequest) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const authHeader = req.headers.get('authorization')
  if (!authHeader) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Agregamos party_members al query paralelo
  const [usersRes, eventsRes, guestsRes, partyRes] = await Promise.all([
    supabaseAdmin.from('users').select('id, email, full_name, plan, created_at').order('created_at', { ascending: false }),
    supabaseAdmin.from('events').select('id, user_id, name, created_at'),
    supabaseAdmin.from('guests').select('id, event_id, rsvp_status'),
    supabaseAdmin.from('party_members').select('id, event_id'),
  ])

  return NextResponse.json({
    users:         usersRes.data  || [],
    events:        eventsRes.data || [],
    guests:        guestsRes.data || [],
    partyMembers:  partyRes.data  || [],
  })
}