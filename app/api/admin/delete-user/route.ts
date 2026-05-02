import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const ADMIN_EMAIL = 'diego.garza@moonlaunch.mx'

export async function POST(req: NextRequest) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verificar que quien llama es el admin
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

  if (authError || !user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { userId, action } = await req.json()
  if (!userId || !action) return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })

  if (action === 'delete') {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    // También borramos de la tabla users
    await supabaseAdmin.from('users').delete().eq('id', userId)
    return NextResponse.json({ ok: true })
  }

  if (action === 'ban') {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      ban_duration: '876600h' // 100 años = efectivamente permanente
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'unban') {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      ban_duration: 'none'
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 })
}