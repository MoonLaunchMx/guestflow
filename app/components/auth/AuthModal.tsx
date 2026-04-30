'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  defaultTab?: 'login' | 'register'
  lang?: 'es' | 'en'
}

const i18n = {
  es: {
    login: 'Iniciar sesión', register: 'Registrarse',
    name: 'Nombre completo', namePlaceholder: 'Ana García',
    email: 'Email', emailPlaceholder: 'ana@ejemplo.com',
    password: 'Contraseña', see: 'ver', hide: 'ocultar',
    submit_login: 'Entrar', submit_register: 'Crear cuenta', loading: 'Cargando...',
    error: 'Email o contraseña incorrectos',
    success: 'Cuenta creada. Te enviamos un correo — cuando quieras, confirma tu cuenta desde el link que te mandamos.',
  },
  en: {
    login: 'Log in', register: 'Sign up',
    name: 'Full name', namePlaceholder: 'Ana García',
    email: 'Email', emailPlaceholder: 'ana@example.com',
    password: 'Password', see: 'show', hide: 'hide',
    submit_login: 'Log in', submit_register: 'Create account', loading: 'Loading...',
    error: 'Incorrect email or password',
    success: "Account created. We sent you an email — confirm your account whenever you're ready.",
  },
}

export default function AuthModal({ isOpen, onClose, defaultTab = 'login', lang = 'es' }: AuthModalProps) {
  const [mode, setMode]                 = useState<'login' | 'register'>(defaultTab)
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [name, setName]                 = useState('')
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')
  const [success, setSuccess]           = useState('')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => { setMode(defaultTab) }, [defaultTab])

  const t = i18n[lang]

  const reset = () => {
    setEmail(''); setPassword(''); setName('')
    setError(''); setSuccess(''); setShowPassword(false)
  }

  const handleClose = () => { reset(); onClose() }

  const handleSubmit = async () => {
    setLoading(true); setError(''); setSuccess('')
    if (mode === 'register') {
      const { data, error } = await supabase.auth.signUp({
        email, password, options: { data: { full_name: name } }
      })
      if (error) setError(error.message)
      else {
        if (data.session) window.location.href = '/dashboard'
        else setSuccess(t.success)
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(t.error)
      else window.location.href = '/dashboard'
    }
    setLoading(false)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
            className="fixed inset-0 z-[100] bg-black/[0.45]"
          />
          <div className="pointer-events-none fixed inset-0 z-[101] flex items-center justify-center px-4">
            <motion.div
              key="modal"
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="pointer-events-auto w-full max-w-[460px]"
            >
              <div className="relative rounded-[20px] border border-[#e8e8e8] bg-white p-8 shadow-[0_8px_40px_rgba(0,0,0,0.12)]">

                <button
                  onClick={handleClose}
                  className="absolute right-4 top-4 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-[#e8e8e8] bg-transparent text-sm text-[#999] transition hover:bg-[#f5f5f5]"
                >
                  ✕
                </button>

                <div className="mb-6 text-center">
                  <p className="m-0 text-2xl font-bold text-[#1D1E20]" style={{ fontFamily: 'Georgia, serif' }}>
                    Anfi<span className="text-[#48C9B0]">ora</span>
                  </p>
                </div>

                <div className="mb-6 flex rounded-[10px] bg-[#f2f2f2] p-1">
                  {(['login', 'register'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => { setMode(tab); setError(''); setSuccess('') }}
                      className={`flex-1 cursor-pointer rounded-[7px] border-none py-2 text-[13px] transition-all ${
                        mode === tab
                          ? 'bg-[#48C9B0] font-semibold text-white'
                          : 'bg-transparent font-normal text-[#888]'
                      }`}
                    >
                      {tab === 'login' ? t.login : t.register}
                    </button>
                  ))}
                </div>

                <div className="flex flex-col gap-4">
                  {mode === 'register' && (
                    <div>
                      <label className="mb-1.5 block text-xs text-[#555]">{t.name}</label>
                      <input
                        type="text" value={name} onChange={e => setName(e.target.value)}
                        placeholder={t.namePlaceholder}
                        className="w-full rounded-[10px] border border-[#e0e0e0] bg-[#f8f8f8] px-3 py-2.5 text-sm text-[#1D1E20] outline-none"
                      />
                    </div>
                  )}
                  <div>
                    <label className="mb-1.5 block text-xs text-[#555]">{t.email}</label>
                    <input
                      type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder={t.emailPlaceholder}
                      className="w-full rounded-[10px] border border-[#e0e0e0] bg-[#f8f8f8] px-3 py-2.5 text-sm text-[#1D1E20] outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs text-[#555]">{t.password}</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'} value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                        className="w-full rounded-[10px] border border-[#e0e0e0] bg-[#f8f8f8] py-2.5 pl-3 pr-[52px] text-sm text-[#1D1E20] outline-none"
                      />
                      <button
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-[10px] top-1/2 -translate-y-1/2 cursor-pointer border-none bg-transparent text-[#aaa]"
                      >
                        <span className="text-[11px] font-medium">
                          {showPassword ? t.hide : t.see}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

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

                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className={`mt-5 w-full rounded-[10px] border-none py-3 text-sm font-semibold text-white transition-colors ${
                    loading
                      ? 'cursor-not-allowed bg-[#9ee0d4]'
                      : 'cursor-pointer bg-[#48C9B0] hover:bg-[#3ab89f]'
                  }`}
                >
                  {loading ? t.loading : mode === 'login' ? t.submit_login : t.submit_register}
                </button>

              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
