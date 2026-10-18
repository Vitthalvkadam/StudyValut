import { useEffect, useState, type FormEvent } from 'react'
import { NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Home, LibraryBig, LogOut, Search, Settings, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { formatBytes } from '../lib/format'
import { cx } from './ui'

const NAV = [
  { to: '/', label: 'Dashboard', icon: Home, end: true },
  { to: '/vault', label: 'My Vault', icon: LibraryBig },
  { to: '/assistant', label: 'Study Assistant', icon: Sparkles },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cx('flex items-center gap-2.5', className)}>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-mustard shadow-card" aria-hidden>
        <span className="block h-4 w-4 rounded-full border-[2.5px] border-ink" />
      </span>
      <span className="font-display text-xl">Study Vault</span>
    </div>
  )
}

function SearchBar() {
  const nav = useNavigate()
  const loc = useLocation()
  const [params] = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')
  useEffect(() => { setQ(loc.pathname.startsWith('/vault') ? params.get('q') ?? '' : '') }, [loc.pathname, params])
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const v = q.trim()
    nav(v ? `/vault?q=${encodeURIComponent(v)}` : '/vault')
  }
  return (
    <form onSubmit={submit} role="search" className="relative w-full max-w-lg">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/45" />
      <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search files and folders" placeholder="Search files and folders"
        className="w-full rounded-xl border border-ink/10 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition placeholder:text-ink/40 focus:border-mustard focus:ring-4 focus:ring-mustard/20" />
    </form>
  )
}

function StorageMeter() {
  const [d, setD] = useState<{ used: number; quota: number } | null>(null)
  const loc = useLocation()
  useEffect(() => { api.dashboard().then((x) => setD({ used: x.storageUsed, quota: x.storageQuota })).catch(() => undefined) }, [loc.pathname, loc.search])
  if (!d) return null
  const pct = Math.min(100, (d.used / d.quota) * 100)
  return (
    <div className="rounded-2xl bg-white p-4 shadow-card">
      <div className="mb-2 flex justify-between text-xs text-ink/65"><span>Storage</span><span>{formatBytes(d.used)} of {formatBytes(d.quota)}</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-ink/10"><div className="h-full rounded-full bg-mustard transition-all" style={{ width: `${Math.max(pct, d.used > 0 ? 2 : 0)}%` }} /></div>
    </div>
  )
}

export default function Layout() {
  const { user, logout } = useAuth()
  const nav = useNavigate()
  const onLogout = async () => { await logout(); nav('/login') }
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[17rem_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-ink/10 bg-cream px-5 py-6 md:flex">
        <Logo className="px-1" />
        <nav className="mt-9 flex flex-1 flex-col gap-1" aria-label="Main">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => cx('flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[15px] font-medium transition-colors',
                isActive ? 'bg-mustard/25 text-ink' : 'text-ink/70 hover:bg-ink/5')}>
              <Icon className="h-[18px] w-[18px]" /> {label}
            </NavLink>
          ))}
        </nav>
        <StorageMeter />
        <div className="mt-4 flex items-center gap-3 px-1">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-lavender/60 text-sm font-semibold text-lavender-deep">{user?.displayName.slice(0, 1).toUpperCase()}</span>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{user?.displayName}</p><p className="truncate text-xs text-ink/55">{user?.email}</p></div>
          <button onClick={onLogout} aria-label="Sign out" className="rounded-lg p-2 text-ink/55 hover:bg-ink/5 hover:text-ink"><LogOut className="h-[18px] w-[18px]" /></button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-ink/10 bg-ivory/90 px-4 py-3 backdrop-blur md:px-8">
          <Logo className="md:hidden [&>span:last-child]:hidden sm:[&>span:last-child]:inline" />
          <div className="flex flex-1 justify-center md:justify-start"><SearchBar /></div>
          <button onClick={onLogout} aria-label="Sign out" className="rounded-lg p-2 text-ink/60 hover:bg-ink/5 md:hidden"><LogOut className="h-5 w-5" /></button>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 md:px-8 md:pb-12 md:pt-8"><Outlet /></main>
      </div>

      <nav aria-label="Main" className="pb-safe fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-ink/10 bg-cream/95 backdrop-blur md:hidden">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) => cx('flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium', isActive ? 'text-ink' : 'text-ink/55')}>
            {({ isActive }) => (<>
              <span className={cx('grid h-7 w-12 place-items-center rounded-full transition-colors', isActive && 'bg-mustard/30')}><Icon className="h-5 w-5" /></span>
              {label.replace('Study ', '')}
            </>)}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
