import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const token = req.cookies.get('sb-access-token') ||
                req.cookies.get('sb-refresh-token') ||
                Array.from(req.cookies.getAll()).find(c => c.name.includes('auth-token'))

  const isAuthPage = req.nextUrl.pathname === '/'

  if (!token && !isAuthPage) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  if (token && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}