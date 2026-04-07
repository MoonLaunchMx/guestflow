import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const cookies = req.cookies.getAll()
  console.log('COOKIES:', JSON.stringify(cookies.map(c => c.name)))
  
  const isAuthPage = req.nextUrl.pathname === '/'
  const hasSbCookie = cookies.some(c => c.name.includes('auth'))

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