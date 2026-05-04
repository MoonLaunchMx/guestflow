'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

// ============================================
// Roles disponibles — owner es implícito (events.user_id)
// ============================================
export type CollaboratorRole = 'owner' | 'admin' | 'editor' | 'viewer'

// ============================================
// Lo que expone el context a toda la app
// ============================================
interface EventAccessContextType {
  role: CollaboratorRole | null
  isOwner: boolean
  canEdit: boolean      // owner + admin + editor
  canAdmin: boolean     // owner + admin
  canInvite: boolean    // owner + admin
  isLoading: boolean
  hasAccess: boolean
}

const EventAccessContext = createContext<EventAccessContextType>({
  role: null,
  isOwner: false,
  canEdit: false,
  canAdmin: false,
  canInvite: false,
  isLoading: true,
  hasAccess: false,
})

// ============================================
// Provider — va en events/[id]/layout.tsx
// Hace UNA query, todos los hijos la consumen del context
// ============================================
export function EventAccessProvider({
  children,
  eventId,
}: {
  children: ReactNode
  eventId: string
}) {
  const [role, setRole] = useState<CollaboratorRole | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function checkAccess() {
      try {
        // Obtener usuario actual
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setIsLoading(false)
          return
        }

        // Verificar si es owner del evento
        const { data: event } = await supabase
          .from('events')
          .select('user_id')
          .eq('id', eventId)
          .single()

        if (event?.user_id === user.id) {
          setRole('owner')
          setIsLoading(false)
          return
        }

        // Verificar si es colaborador activo
        const { data: collaborator } = await supabase
          .from('event_collaborators')
          .select('role, status')
          .eq('event_id', eventId)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single()

        if (collaborator) {
          setRole(collaborator.role as CollaboratorRole)
        }
      } catch {
        console.error('[event-access] Error verificando acceso')
      } finally {
        setIsLoading(false)
      }
    }

    checkAccess()
  }, [eventId])

  // Derivar permisos del rol — una sola fuente de verdad
  const isOwner = role === 'owner'
  const canAdmin = role === 'owner' || role === 'admin'
  const canEdit = role === 'owner' || role === 'admin' || role === 'editor'
  const canInvite = role === 'owner' || role === 'admin'
  const hasAccess = role !== null

  return (
    <EventAccessContext.Provider value={{
      role,
      isOwner,
      canEdit,
      canAdmin,
      canInvite,
      isLoading,
      hasAccess,
    }}>
      {children}
    </EventAccessContext.Provider>
  )
}

// ============================================
// Hook — lo que usan todos los componentes hijos
// ============================================
export function useEventAccess() {
  return useContext(EventAccessContext)
}