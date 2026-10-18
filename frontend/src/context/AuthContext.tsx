import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, type User } from '../lib/api'

type AuthState = {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  setUser: (u: User | null) => void
}

const Ctx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.me().then(setUser).catch(() => setUser(null)).finally(() => setLoading(false))
    const onUnauthorized = () => setUser(null)
    window.addEventListener('sv:unauthorized', onUnauthorized)
    return () => window.removeEventListener('sv:unauthorized', onUnauthorized)
  }, [])

  const login = useCallback(async (email: string, password: string) => setUser(await api.login(email, password)), [])
  const register = useCallback(async (n: string, e: string, p: string) => setUser(await api.register(n, e, p)), [])
  const logout = useCallback(async () => { try { await api.logout() } finally { setUser(null) } }, [])

  const value = useMemo(() => ({ user, loading, login, register, logout, setUser }), [user, loading, login, register, logout])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth must be used inside AuthProvider')
  return c
}
