// app/api/webhook/whatsapp/route.ts
// Recibe mensajes entrantes de 360dialog (o mock) y procesa el RSVP automáticamente

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { interpretRSVPMessage } from '@/lib/ai-rsvp'

// Cliente de Supabase con service role key (no anon) para bypass de RLS en webhook
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // --- Normalizar payload ---
    // 360dialog manda un formato específico. También aceptamos mock directo.
    const incomingMessage = normalize360dialogPayload(body)

    if (!incomingMessage) {
      return NextResponse.json({ ok: true, skipped: 'no text message' })
    }

    const { phone, text } = incomingMessage

    // --- Buscar invitado por teléfono ---
    const { data: guest, error: guestError } = await supabase
      .from('guests')
      .select('id, name, event_id, rsvp_status')
      .eq('phone', phone)
      .single()

    if (guestError || !guest) {
      // Guardar el mensaje aunque no encontremos al invitado (puede ser spam o número no registrado)
      console.log(`Mensaje de número no registrado: ${phone}`)
      return NextResponse.json({ ok: true, skipped: 'guest not found' })
    }

    // --- Obtener nombre del evento ---
    const { data: event } = await supabase
      .from('events')
      .select('name')
      .eq('id', guest.event_id)
      .single()

    const eventName = event?.name ?? 'tu evento'

    // --- Guardar mensaje entrante en wa_messages ---
    await supabase.from('wa_messages').insert({
      guest_id: guest.id,
      direction: 'inbound',
      body: text,
      status: 'received',
      sent_at: new Date().toISOString(),
    })

    // --- Interpretar RSVP con Claude ---
    const interpretation = await interpretRSVPMessage(text, guest.name, eventName)

    console.log(`[AI RSVP] ${guest.name}: "${text}" → ${interpretation.intent} (${interpretation.confidence})`)

    // --- Actualizar RSVP solo si confidence es high o medium ---
    if (interpretation.intent !== 'ambiguous' && interpretation.confidence !== 'low') {
      const newStatus = interpretation.intent // 'confirmed' | 'declined'

      if (guest.rsvp_status !== newStatus) {
        await supabase
          .from('guests')
          .update({ rsvp_status: newStatus })
          .eq('id', guest.id)

        console.log(`[RSVP] ${guest.name}: ${guest.rsvp_status} → ${newStatus}`)
      }
    }

    return NextResponse.json({
      ok: true,
      guest: guest.name,
      message: text,
      interpretation,
    })
  } catch (error) {
    console.error('[Webhook Error]', error)
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 })
  }
}

// 360dialog manda el payload en este formato:
// { messages: [{ from: "521234567890", type: "text", text: { body: "Sí confirmo" } }] }
function normalize360dialogPayload(body: Record<string, unknown>): { phone: string; text: string } | null {
  // Formato 360dialog real
  if (body.messages && Array.isArray(body.messages)) {
    const msg = body.messages[0]
    if (msg?.type === 'text' && msg?.text?.body) {
      return {
        phone: String(msg.from),
        text: String(msg.text.body),
      }
    }
  }

  // Formato mock directo (para testing)
  if (body.phone && body.text) {
    return {
      phone: String(body.phone),
      text: String(body.text),
    }
  }

  return null
}