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
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100 }}
          />
          <div style={{
            position: 'fixed', inset: 0, zIndex: 101,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 1rem', pointerEvents: 'none',
          }}>
            <motion.div
              key="modal"
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              style={{ width: '100%', maxWidth: '460px', pointerEvents: 'auto' }}
            >
              <div style={{
                background: '#ffffff', borderRadius: '20px',
                border: '1px solid #e8e8e8',
                boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
                padding: '2rem', position: 'relative',
              }}>
                <button onClick={handleClose} style={{
                  position: 'absolute', top: '1rem', right: '1rem',
                  width: '28px', height: '28px', borderRadius: '50%',
                  border: '1px solid #e8e8e8', background: 'transparent',
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '14px', color: '#999',
                }}>✕</button>

                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                  <p style={{ fontFamily: 'Georgia, serif', fontSize: '24px', fontWeight: 700, color: '#1D1E20', margin: 0 }}>
                    Guest<span style={{ color: '#48C9B0' }}>Flow</span>
                  </p>
                </div>

                <div style={{ display: 'flex', background: '#f2f2f2', borderRadius: '10px', padding: '4px', marginBottom: '1.5rem' }}>
                  {(['login', 'register'] as const).map(tab => (
                    <button key={tab}
                      onClick={() => { setMode(tab); setError(''); setSuccess('') }}
                      style={{
                        flex: 1, padding: '8px', borderRadius: '7px', border: 'none',
                        cursor: 'pointer', fontSize: '13px',
                        fontWeight: mode === tab ? 600 : 400,
                        background: mode === tab ? '#48C9B0' : 'transparent',
                        color: mode === tab ? '#ffffff' : '#888',
                        transition: 'all 0.2s',
                      }}
                    >
                      {tab === 'login' ? t.login : t.register}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {mode === 'register' && (
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#555', marginBottom: '6px' }}>{t.name}</label>
                      <input type="text" value={name} onChange={e => setName(e.target.value)}
                        placeholder={t.namePlaceholder}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e0e0e0', background: '#f8f8f8', fontSize: '14px', color: '#1D1E20', outline: 'none' }}
                      />
                    </div>
                  )}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#555', marginBottom: '6px' }}>{t.email}</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder={t.emailPlaceholder}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e0e0e0', background: '#f8f8f8', fontSize: '14px', color: '#1D1E20', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#555', marginBottom: '6px' }}>{t.password}</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPassword ? 'text' : 'password'} value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '10px 52px 10px 12px', borderRadius: '10px', border: '1px solid #e0e0e0', background: '#f8f8f8', fontSize: '14px', color: '#1D1E20', outline: 'none' }}
                      />
                      <button onClick={() => setShowPassword(!showPassword)}
                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#aaa' }}
                      >
                        <span style={{ fontSize: '11px', fontWeight: 500 }}>
                          {showPassword ? t.hide : t.see}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {error && (
                  <div style={{ marginTop: '1rem', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ffc0c0', background: '#fff0f0', fontSize: '12px', color: '#cc3333' }}>
                    {error}
                  </div>
                )}
                {success && (
                  <div style={{ marginTop: '1rem', padding: '10px 12px', borderRadius: '8px', border: '1px solid #a0e0c0', background: '#f0fff6', fontSize: '12px', color: '#2a7a50' }}>
                    {success}
                  </div>
                )}

                <button onClick={handleSubmit} disabled={loading} style={{
                  marginTop: '1.25rem', width: '100%', padding: '12px',
                  borderRadius: '10px', border: 'none',
                  background: loading ? '#9ee0d4' : '#48C9B0',
                  color: '#ffffff', fontSize: '14px', fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.2s',
                }}>
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