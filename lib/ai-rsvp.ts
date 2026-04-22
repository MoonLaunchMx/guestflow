// lib/ai-rsvp.ts
export type RSVPIntent = 'confirmed' | 'declined' | 'ambiguous'

export interface RSVPInterpretation {
  intent: RSVPIntent
  confidence: 'high' | 'medium' | 'low'
  reasoning: string
}

export async function interpretRSVPMessage(
  message: string,
  guestName: string,
  eventName: string
): Promise<RSVPInterpretation> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: `Eres un asistente que interpreta respuestas de invitados a eventos.
Tu única tarea es determinar si un mensaje indica confirmación de asistencia, declinación, o es ambiguo.

Responde ÚNICAMENTE con JSON válido, sin markdown, sin backticks, sin texto adicional antes o después:
{"intent": "confirmed", "confidence": "high", "reasoning": "explicación breve"}

Valores posibles para intent: "confirmed", "declined", "ambiguous"
Valores posibles para confidence: "high", "medium", "low"

Ejemplos de confirmación: "sí voy", "ahí estaremos", "confirmado", "claro que sí", "simón", "de una", "allá nos vemos", "con gusto asistimos"
Ejemplos de declinación: "no puedo", "no voy a poder", "nel", "qué pena pero no", "no nos será posible"
Ambiguo: preguntas, saludos, mensajes sin relación clara con asistencia`,
      messages: [
        {
          role: 'user',
          content: `Evento: "${eventName}"\nInvitado: "${guestName}"\nMensaje: "${message}"\n\nResponde solo con JSON:`,
        },
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[AI RSVP] Anthropic error:', errorText)
    throw new Error(`Anthropic API error: ${response.status}`)
  }

  const data = await response.json()
  const raw = data.content[0].text.trim()
  
  console.log('[AI RSVP] Respuesta raw:', raw)

  // Limpiar markdown por si Claude lo incluye de todas formas
  const clean = raw
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()

  try {
    return JSON.parse(clean) as RSVPInterpretation
  } catch {
    console.error('[AI RSVP] JSON inválido:', clean)
    return {
      intent: 'ambiguous',
      confidence: 'low',
      reasoning: 'No se pudo parsear la respuesta del modelo',
    }
  }
}