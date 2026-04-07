import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const isAuthPage = req.nextUrl.pathname === '/'

  // Busca cualquier cookie de Supabase auth
  const hasSbCookie = req.cookies.getAll().some(c =>
    c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
  )

  if (!hasSbCookie && !isAuthPage) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  if (hasSbCookie && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}