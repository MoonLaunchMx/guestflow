import type { Metadata } from 'next'
import './globals.css'
import { PostHogProvider } from './components/PostHogProvider'

export const metadata: Metadata = {
  title: 'Anfiora',
  description: 'Gestión de invitados para eventos',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body><PostHogProvider>{children}</PostHogProvider></body>
    </html>
  )
}