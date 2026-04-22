// app/api/webhook/whatsapp/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { interpretRSVPMessage } from '@/lib/ai-rsvp'

export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const body = await request.json()
    console.log('[Webhook] Body recibido:', JSON.stringify(body))

    const incomingMessage = normalize360dialogPayload(body)
    console.log('[Webhook] Mensaje normalizado:', incomingMessage)

    if (!incomingMessage) {
      return NextResponse.json({ ok: true, skipped: 'no text message' })
    }

    const { phone, text } = incomingMessage

    const { data: guests, error: guestError } = await supabase
      .from('guests')
      .select('id, name, event_id, rsvp_status')
      .eq('phone', phone)
      .limit(1)

    console.log('[Webhook] Guests encontrados:', JSON.stringify(guests))
    console.log('[Webhook] Guest error:', JSON.stringify(guestError))

    if (guestError || !guests || guests.length === 0) {
      console.log(`[Webhook] Número no registrado: ${phone}`)
      return NextResponse.json({ ok: true, skipped: 'guest not found' })
    }

    const guest = guests[0]
    const guestName = guest.name?.trim() || 'Invitado'

    const { data: event } = await supabase
      .from('events')
      .select('name')
      .eq('id', guest.event_id)
      .single()

    const eventName = event?.name ?? 'tu evento'

    await supabase.from('wa_messages').insert({
      guest_id: guest.id,
      direction: 'inbound',
      body: text,
      status: 'received',
      sent_at: new Date().toISOString(),
    })

    const interpretation = await interpretRSVPMessage(text, guestName, eventName)

    console.log(`[AI RSVP] ${guestName}: "${text}" → ${interpretation.intent} (${interpretation.confidence})`)

    if (interpretation.intent !== 'ambiguous' && interpretation.confidence !== 'low') {
      const newStatus = interpretation.intent

      if (guest.rsvp_status !== newStatus) {
        await supabase
          .from('guests')
          .update({ rsvp_status: newStatus })
          .eq('id', guest.id)

        console.log(`[RSVP] ${guestName}: ${guest.rsvp_status} → ${newStatus}`)
      }
    }

    return NextResponse.json({
      ok: true,
      guest: guestName,
      message: text,
      interpretation,
    })
  } catch (error) {
    console.error('[Webhook Error]', error)
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 })
  }
}

function normalize360dialogPayload(body: Record<string, unknown>): { phone: string; text: string } | null {
  if (body.messages && Array.isArray(body.messages)) {
    const msg = body.messages[0]
    if (msg?.type === 'text' && msg?.text?.body) {
      return {
        phone: String(msg.from),
        text: String(msg.text.body),
      }
    }
  }

  if (body.phone && body.text) {
    return {
      phone: String(body.phone),
      text: String(body.text),
    }
  }

  return null
}