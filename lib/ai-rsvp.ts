// lib/ai-rsvp.ts
// Interpreta mensajes de WhatsApp y determina el intent de RSVP

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

Responde ÚNICAMENTE con JSON válido en este formato exacto, sin texto adicional:
{"intent": "confirmed" | "declined" | "ambiguous", "confidence": "high" | "medium" | "low", "reasoning": "explicación breve en español"}

Ejemplos de confirmación: "sí voy", "ahí estaremos", "confirmado", "claro que sí", "simón", "de una", "allá nos vemos", "con gusto asistimos", "contad con nosotros"
Ejemplos de declinación: "no puedo", "no voy a poder", "nel", "qué pena pero no", "no nos será posible", "lamentablemente no"
Ambiguo: preguntas, saludos, mensajes sin relación clara con el RSVP`,
      messages: [
        {
          role: 'user',
          content: `Evento: "${eventName}"
Invitado: "${guestName}"
Mensaje recibido: "${message}"

¿Cuál es el intent de RSVP?`,
        },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`)
  }

  const data = await response.json()
  const text = data.content[0].text.trim()

  try {
    return JSON.parse(text) as RSVPInterpretation
  } catch {
    // Si Claude no devuelve JSON válido (no debería pasar), fallback seguro
    return {
      intent: 'ambiguous',
      confidence: 'low',
      reasoning: 'No se pudo interpretar la respuesta del modelo',
    }
  }
}