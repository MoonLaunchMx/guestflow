import Anthropic from '@anthropic-ai/sdk'

export type RSVPIntent = 'confirmed' | 'declined' | 'respondio' | 'accion_necesaria' | 'ambiguous'

export interface RSVPInterpretation {
  intent: RSVPIntent
  confidence: 'high' | 'medium' | 'low'
  reasoning: string
}

const client = new Anthropic()

const SYSTEM_PROMPT = `Eres un asistente que interpreta respuestas de invitados a eventos sociales (bodas, quinceañeras, fiestas, etc.).
Tu única tarea es clasificar el mensaje en uno de 5 intents.

Responde ÚNICAMENTE con JSON válido, sin markdown, sin backticks, sin texto adicional antes o después:
{"intent": "confirmed", "confidence": "high", "reasoning": "explicación breve"}

─── DEFINICIONES ───────────────────────────────────────────────

"confirmed" — el invitado confirma claramente que asistirá.
  ✓ "sí voy", "ahí estaremos", "confirmado", "claro que sí", "simón", "de una", "allá nos vemos", "con gusto asistimos", "contamos con ir"

"declined" — el invitado declina claramente que no podrá asistir.
  ✓ "no puedo", "no voy a poder", "nel", "qué pena pero no", "no nos será posible", "lamentablemente no podemos"

"respondio" — el invitado responde de forma real pero NO confirma ni declina asistencia.
  Incluye: preguntas sobre el evento, comentarios, acuses de recibo, información sobre llegada tardía, solicitudes de detalle logístico.
  ✓ "¿a qué hora es la ceremonia?", "¿a qué hora empieza?", "¿cuál es la dirección?", "¿cómo llego?", "¿hay estacionamiento?"
  ✓ "gracias por el aviso", "ok recibido", "hola", "entendido", "muchas gracias"
  ✓ "llegaremos un poco tarde", "iremos después de la ceremonia", "llegamos al rato"
  ✓ "¿puedo llevar a mi pareja?", "somos 3", "venimos del trabajo directo"

"accion_necesaria" — el mensaje revela un problema que el organizador DEBE atender para coordinar con catering, logística u otros proveedores.
  Incluye: alergias o restricciones alimentarias (el catering necesita saberlo), discapacidad o necesidad de accesibilidad, conflicto de fechas o imposibilidad parcial que requiere aclaración, queja o situación delicada, emergencia.
  ✓ "soy alérgico a los mariscos", "soy celiaco", "soy vegano / vegetariano", "no como cerdo", "tengo diabetes"
  ✓ "uso silla de ruedas", "no puedo subir escaleras", "soy embarazada"
  ✓ "tengo un compromiso a esa hora pero quizás pueda ir", "no sé si podré"
  ✓ "hubo un problema con mi boleto", "no recibí la invitación", "tuve un inconveniente"

"ambiguous" — mensaje sin contenido relevante para el evento: emojis solos, spam, texto ininteligible, mensajes enviados por error.
  ✓ "👍", "jaja", "ok" sin contexto, "hola" después de un saludo ya procesado

─── REGLA DE DESEMPATE ─────────────────────────────────────────

Si el mensaje combina intents (ej: "soy alérgico pero sí voy"), elige el de mayor impacto operativo:
  accion_necesaria > confirmed/declined > respondio > ambiguous

Valores posibles para confidence: "high", "medium", "low"`

export async function interpretRSVPMessage(
  message: string,
  guestName: string,
  eventName: string
): Promise<RSVPInterpretation> {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 200,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: `Evento: "${eventName}"\nInvitado: "${guestName}"\nMensaje: "${message}"\n\nResponde solo con JSON:`,
      },
    ],
  })

  const block = response.content[0]
  if (block.type !== 'text') {
    return { intent: 'ambiguous', confidence: 'low', reasoning: 'Respuesta inesperada del modelo' }
  }

  const raw = block.text.trim()
  console.log('[AI RSVP] Respuesta raw:', raw)

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
