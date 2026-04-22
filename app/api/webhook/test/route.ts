// app/api/webhook/test/route.ts
// Endpoint de testing — simula un mensaje entrante de WhatsApp sin necesitar 360dialog
// USAR SOLO EN DESARROLLO — en producción esto debería estar protegido o eliminado

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const body = await request.json()

  // Reenvía el payload al webhook real
  const webhookUrl = new URL('/api/webhook/whatsapp', request.url).toString()

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: body.phone,
      text: body.text,
    }),
  })

  const result = await response.json()
  return NextResponse.json(result)
}