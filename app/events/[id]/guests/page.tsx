'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function GuestsRedirect() {
  const { id } = useParams()
  const router = useRouter()

  useEffect(() => {
    router.replace(`/events/${id}`)
  }, [id])

  return null
}