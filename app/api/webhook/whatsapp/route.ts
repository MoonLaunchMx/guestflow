import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { interpretRSVPMessage } from '@/lib/ai-rsvp'

const TWIML_EMPTY = '<Response/>'

export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const form = await request.formData()
    const text = (form.get('Body') as string | null)?.trim() ?? ''
    const from = (form.get('From') as string | null) ?? ''

    // Twilio sends "whatsapp:+521234567890" — strip the prefix
    const phone = from.replace(/^whatsapp:/i, '')

    console.log('[Webhook] Twilio message — from:', phone, 'text:', text)

    if (!text || !phone) {
      return twimlResponse()
    }

    const { data: guests, error: guestError } = await supabase
      .from('guests')
      .select('id, name, event_id, rsvp_status')
      .eq('phone', phone)
      .limit(1)

    console.log('[Webhook] Guests encontrados:', JSON.stringify(guests))

    if (guestError || !guests || guests.length === 0) {
      console.log(`[Webhook] Número no registrado: ${phone}`)
      return twimlResponse()
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

      const replyText = buildReplyMessage(interpretation.intent, guestName, eventName)
      if (replyText) await sendWhatsAppReply(from, replyText)
    }

    return twimlResponse()
  } catch (error) {
    console.error('[Webhook Error]', error)
    // Still return TwiML — Twilio expects it even on errors
    return twimlResponse()
  }
}

function twimlResponse() {
  return new NextResponse(TWIML_EMPTY, {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  })
}

function buildReplyMessage(intent: string, guestName: string, eventName: string): string | null {
  switch (intent) {
    case 'confirmed':
      return `¡Gracias, ${guestName}! Tu asistencia a *${eventName}* ha sido confirmada. ¡Te esperamos! 🎉`
    case 'declined':
      return `Entendido, ${guestName}. Hemos registrado que no podrás asistir a *${eventName}*. ¡Quizás en otra ocasión!`
    case 'respondio':
      return `¡Gracias por escribirnos, ${guestName}! Hemos recibido tu mensaje. 😊`
    case 'accion_necesaria':
      return `Hola ${guestName}, gracias por escribirnos. Hemos recibido tu mensaje y un organizador lo atenderá pronto.`
    default:
      return null
  }
}

async function sendWhatsAppReply(to: string, body: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID!
  const authToken = process.env.TWILIO_AUTH_TOKEN!
  const from = process.env.TWILIO_WHATSAPP_FROM! // e.g. "whatsapp:+14155238886"

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64')

  const params = new URLSearchParams({ To: to, From: from, Body: body })

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[Twilio] Error al enviar mensaje:', err)
  } else {
    console.log('[Twilio] Mensaje enviado a', to)
  }
}
