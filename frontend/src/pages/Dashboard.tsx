import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, FolderPlus, LibraryBig, Sparkles, Star } from 'lucide-react'
import { api, type Dashboard as Data } from '../lib/api'
import { formatBytes } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import { FileCard } from '../components/FileCard'
import { FolderCard } from '../components/FolderCard'
import { Button, EmptyState, Spinner } from '../components/ui'

function Stat({ label, value, tone, sub }: { label: string; value: string; tone: string; sub?: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-card">
      <span className={`mb-3 block h-1.5 w-8 rounded-full ${tone}`} />
      <p className="font-display text-3xl">{value}</p>
      <p className="mt-0.5 text-sm text-ink/60">{label}</p>
      {sub && <p className="mt-0.5 text-xs text-ink/45">{sub}</p>}
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState('')
  const load = useCallback(() => { api.dashboard().then(setData).catch((e) => setError(e.message)) }, [])
  useEffect(load, [load])

  if (error) return <p role="alert" className="rounded-2xl bg-terracotta/15 p-4 text-terracotta-deep">{error}</p>
  if (!data) return <Spinner />
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const pct = Math.min(100, (data.storageUsed / data.storageQuota) * 100)
  const empty = data.fileCount === 0 && data.folderCount === 0

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-3xl sm:text-4xl">{greet}, {user?.displayName.split(' ')[0]}</h1>
          <p className="mt-1.5 text-ink/65">{empty ? 'Your vault is ready for its first study material.' : 'Here’s what’s in your vault.'}</p></div>
        <div className="flex gap-2">
          <Link to="/assistant"><Button variant="soft"><Sparkles className="h-4 w-4" /> Ask the assistant</Button></Link>
          <Link to="/vault"><Button><LibraryBig className="h-4 w-4" /> Open vault</Button></Link>
        </div>
      </div>

      <section aria-label="Statistics" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Files" value={String(data.fileCount)} tone="bg-mustard" />
        <Stat label="Folders" value={String(data.folderCount)} tone="bg-sage" />
        <Stat label="Favorites" value={String(data.favoriteCount)} tone="bg-lavender" />
        <div className="rounded-2xl bg-white p-5 shadow-card">
          <span className="mb-3 block h-1.5 w-8 rounded-full bg-terracotta" />
          <p className="font-display text-3xl">{formatBytes(data.storageUsed)}</p>
          <p className="mt-0.5 text-sm text-ink/60">of {formatBytes(data.storageQuota)} used</p>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-ink/10"><div className="h-full rounded-full bg-terracotta" style={{ width: `${Math.max(pct, data.storageUsed ? 2 : 0)}%` }} /></div>
        </div>
      </section>

      {empty ? (
        <EmptyState icon={<FolderPlus className="h-8 w-8" />} title="Nothing here yet"
          action={<Link to="/vault"><Button>Create a folder or upload a file</Button></Link>}>
          Make a folder for each course, then drop in your PDFs, slides, and photos of the whiteboard.
        </EmptyState>
      ) : (<>
        <section>
          <div className="mb-4 flex items-center justify-between"><h2 className="text-2xl">Folders</h2><Link to="/vault" className="text-sm font-semibold underline decoration-mustard decoration-2 underline-offset-4">See all</Link></div>
          {data.folders.length === 0
            ? <p className="rounded-2xl bg-cream p-5 text-sm text-ink/60">No folders yet. Create one in My Vault to keep courses tidy.</p>
            : <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">{data.folders.map((f) => <FolderCard key={f.id} folder={f} onChange={load} />)}</div>}
        </section>
        <section>
          <h2 className="mb-4 text-2xl">Recent files</h2>
          {data.recentFiles.length === 0
            ? <EmptyState icon={<FileText className="h-8 w-8" />} title="No files yet">Uploads and camera photos will show up here.</EmptyState>
            : <div className="grid gap-3 md:grid-cols-2">{data.recentFiles.map((f) => <FileCard key={f.id} file={f} onChange={load} showFolder />)}</div>}
        </section>
        {data.favoriteCount > 0 && <Link to="/vault?fav=1" className="inline-flex items-center gap-2 text-sm font-semibold"><Star className="h-4 w-4 fill-mustard text-mustard-dark" /> View your {data.favoriteCount} favorite{data.favoriteCount === 1 ? '' : 's'}</Link>}
      </>)}
    </div>
  )
}
