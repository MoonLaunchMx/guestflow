'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
export const dynamic = 'force-dynamic'

export default function AuthPage() {
  const [mode, setMode]               = useState<'login' | 'register'>('login')
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [name, setName]               = useState('')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async () => {
    setLoading(true); setError(''); setSuccess('')
    if (mode === 'register') {
      const { error } = await supabase.auth.signUp({
        email, password, options: { data: { full_name: name } }
      })
      if (error) setError(error.message)
      else setSuccess('¡Cuenta creada! Revisa tu email para confirmar.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError('Email o contraseña incorrectos')
      else window.location.href = '/dashboard'
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-8 font-sans">
      <div className="w-full max-w-sm">

        {/* ── Logo ── */}
        <div className="mb-10 text-center">
          <p className="text-3xl font-bold tracking-tight text-[#0a0a0a]" style={{ fontFamily: 'Georgia, serif' }}>
            Guest<span className="text-[#48C9B0]">Flow</span>
          </p>
          <p className="mt-1.5 text-xs uppercase tracking-widest text-[#999]">
            Gestión de invitados
          </p>
        </div>

        {/* ── Card ── */}
        <div className="rounded-2xl border border-[#e8e8e8] bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)] sm:p-8">

          {/* Tabs */}
          <div className="mb-6 flex rounded-lg bg-[#f2f2f2] p-1">
            {(['login', 'register'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => { setMode(tab); setError(''); setSuccess('') }}
                className={`flex-1 rounded-md py-2 text-sm transition
                  ${mode === tab
                    ? 'bg-[#48C9B0] font-semibold text-white'
                    : 'font-normal text-[#888] hover:text-[#555]'
                  }`}
              >
                {tab === 'login' ? 'Iniciar sesión' : 'Registrarse'}
              </button>
            ))}
          </div>

          {/* Campos */}
          <div className="flex flex-col gap-4">
            {mode === 'register' && (
              <div>
                <label className="mb-1.5 block text-xs text-[#555]">Nombre completo</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ana García"
                  className="w-full rounded-lg border border-[#e0e0e0] bg-[#f8f8f8] px-3 py-3 text-sm text-[#0a0a0a] outline-none transition focus:border-[#48C9B0]"
                />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs text-[#555]">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="ana@ejemplo.com"
                className="w-full rounded-lg border border-[#e0e0e0] bg-[#f8f8f8] px-3 py-3 text-sm text-[#0a0a0a] outline-none transition focus:border-[#48C9B0]"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-[#555]">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  className="w-full rounded-lg border border-[#e0e0e0] bg-[#f8f8f8] py-3 pl-3 pr-10 text-sm text-[#0a0a0a] outline-none transition focus:border-[#48C9B0]"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-base text-[#aaa]"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
          </div>

          {/* Mensajes */}
          {!error && !success && mode === 'login' && (
            <div className="mt-4 rounded-lg border border-[#a0e0d8] bg-[#f0fdfb] px-3 py-2.5 text-center text-xs text-[#1a9e88]">
              Inicia sesión para continuar
            </div>
          )}
          {error && (
            <div className="mt-4 rounded-lg border border-[#ffc0c0] bg-[#fff0f0] px-3 py-2.5 text-xs text-[#cc3333]">
              {error}
            </div>
          )}
          {success && (
            <div className="mt-4 rounded-lg border border-[#a0e0c0] bg-[#f0fff6] px-3 py-2.5 text-xs text-[#2a7a50]">
              {success}
            </div>
          )}

          {/* Botón principal */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="mt-5 w-full rounded-lg bg-[#48C9B0] py-3.5 text-sm font-semibold text-white transition hover:bg-[#3ab89f] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Cargando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-[#bbb]">
          GuestFlow · Para todo tipo de organizadores de eventos
        </p>

      </div>
    </div>
  )
}