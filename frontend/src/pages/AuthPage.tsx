import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { FileText, FolderClosed, Image as ImageIcon, Lock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Logo } from '../components/Layout'
import { Button, Field } from '../components/ui'

export default function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { user, login, register, loading } = useAuth()
  const loc = useLocation()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const isLogin = mode === 'login'

  if (!loading && user) return <Navigate to={(loc.state as { from?: string } | null)?.from ?? '/'} replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setError('')
    try { isLogin ? await login(email, password) : await register(name, email, password) }
    catch (er) { setError((er as Error).message) } finally { setBusy(false) }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="text-3xl sm:text-4xl">{isLogin ? 'Welcome back' : 'Start your vault'}</h1>
          <p className="mt-2 text-ink/65">{isLogin ? 'Sign in to pick up where you left off.' : 'A private place for your notes, slides, and scans.'}</p>
          <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
            {!isLogin && <Field label="Your name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />}
            <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
            <Field label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
              autoComplete={isLogin ? 'current-password' : 'new-password'} hint={isLogin ? undefined : 'At least 8 characters.'} />
            {error && <p role="alert" className="rounded-xl bg-terracotta/15 px-3.5 py-2.5 text-sm text-terracotta-deep">{error}</p>}
            <Button type="submit" loading={busy} className="w-full py-3">{isLogin ? 'Sign in' : 'Create account'}</Button>
          </form>
          <p className="mt-6 text-sm text-ink/65">
            {isLogin ? 'New here? ' : 'Already have an account? '}
            <Link to={isLogin ? '/register' : '/login'} state={loc.state} className="font-semibold text-ink underline decoration-mustard decoration-2 underline-offset-4">
              {isLogin ? 'Create an account' : 'Sign in'}
            </Link>
          </p>
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-mustard/25 lg:block" aria-hidden>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-10 p-12">
          <div className="relative w-[22rem]">
            <span className="absolute -top-3.5 left-0 h-4 w-24 rounded-t-xl bg-sage" />
            <div className="rounded-3xl rounded-tl-none bg-cream p-6 shadow-lift">
              <p className="font-display text-xl">Biology 201</p>
              <p className="mb-4 text-xs text-ink/55">Only you can open this</p>
              {[{ i: FileText, t: 'Cell division notes.pdf', c: 'bg-terracotta/25 text-terracotta-deep' }, { i: ImageIcon, t: 'Whiteboard photo.jpg', c: 'bg-lavender/50 text-lavender-deep' }, { i: FolderClosed, t: 'Lab reports', c: 'bg-sage/40 text-sage-deep' }].map(({ i: I, t, c }) => (
                <div key={t} className="mb-2.5 flex items-center gap-3 rounded-2xl bg-white p-3 shadow-card">
                  <span className={`grid h-9 w-9 place-items-center rounded-xl ${c}`}><I className="h-[18px] w-[18px]" /></span><span className="text-sm font-medium">{t}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="flex max-w-xs items-start gap-2.5 text-center text-sm text-ink/70"><Lock className="mt-0.5 h-4 w-4 shrink-0" />Your files stay private to your account and are never shared with other students.</p>
        </div>
      </div>
    </div>
  )
}
