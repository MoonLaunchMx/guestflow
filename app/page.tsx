'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    setSuccess('')

    if (mode === 'register') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } }
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
    <div style={{
      minHeight: '100vh',
      background: '#ffffff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Georgia, serif',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{
            fontSize: '28px',
            fontWeight: '700',
            color: '#0a0a0a',
            letterSpacing: '-0.5px',
            fontFamily: 'Georgia, serif'
          }}>
            Guest<span style={{ color: '#48C9B0' }}>Flow</span>
          </div>
          <div style={{
            fontSize: '13px',
            color: '#999',
            marginTop: '6px',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            fontFamily: 'system-ui, sans-serif'
          }}>
            Gestión de invitados
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e8e8e8',
          borderRadius: '16px',
          padding: '40px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}>
          {/* Tabs */}
          <div style={{
            display: 'flex',
            marginBottom: '32px',
            background: '#f2f2f2',
            borderRadius: '8px',
            padding: '4px',
          }}>
            {(['login', 'register'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => { setMode(tab); setError(''); setSuccess('') }}
                style={{
                  flex: 1,
                  padding: '8px',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontFamily: 'system-ui, sans-serif',
                  fontWeight: mode === tab ? '600' : '400',
                  background: mode === tab ? '#48C9B0' : 'transparent',
                  color: mode === tab ? '#ffffff' : '#888',
                  transition: 'all 0.2s',
                }}
              >
                {tab === 'login' ? 'Iniciar sesión' : 'Registrarse'}
              </button>
            ))}
          </div>

          {/* Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {mode === 'register' && (
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#555', marginBottom: '6px', fontFamily: 'system-ui, sans-serif' }}>
                  Nombre completo
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ana García"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    background: '#f8f8f8',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    color: '#0a0a0a',
                    fontSize: '15px',
                    fontFamily: 'system-ui, sans-serif',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#555', marginBottom: '6px', fontFamily: 'system-ui, sans-serif' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="ana@ejemplo.com"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  background: '#f8f8f8',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  color: '#0a0a0a',
                  fontSize: '15px',
                  fontFamily: 'system-ui, sans-serif',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#555', marginBottom: '6px', fontFamily: 'system-ui, sans-serif' }}>
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  background: '#f8f8f8',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  color: '#0a0a0a',
                  fontSize: '15px',
                  fontFamily: 'system-ui, sans-serif',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Error / Success */}
          {error && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              background: '#fff0f0',
              border: '1px solid #ffc0c0',
              borderRadius: '8px',
              color: '#cc3333',
              fontSize: '13px',
              fontFamily: 'system-ui, sans-serif',
            }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              background: '#f0fff6',
              border: '1px solid #a0e0c0',
              borderRadius: '8px',
              color: '#2a7a50',
              fontSize: '13px',
              fontFamily: 'system-ui, sans-serif',
            }}>
              {success}
            </div>
          )}

          {/* Button */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: '100%',
              marginTop: '24px',
              padding: '14px',
              background: loading ? '#a0e0d8' : '#48C9B0',
              border: 'none',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: '600',
              fontFamily: 'system-ui, sans-serif',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {loading ? 'Cargando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </div>

        <div style={{
          textAlign: 'center',
          marginTop: '24px',
          fontSize: '12px',
          color: '#bbb',
          fontFamily: 'system-ui, sans-serif',
        }}>
          GuestFlow · Para wedding planners en LATAM
        </div>
      </div>
    </div>
  )
}
