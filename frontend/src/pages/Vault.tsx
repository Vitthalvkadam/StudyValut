import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Camera, ChevronRight, FilePlus2, FolderPlus, Home, SearchX, Star, Upload } from 'lucide-react'
import { api, type FileItem, type Folder, type FolderDetail } from '../lib/api'
import { ACCEPT } from '../lib/format'
import { FileCard } from '../components/FileCard'
import { FolderCard, FolderDialog } from '../components/FolderCard'
import { useUploads } from '../components/Uploads'
import CameraCapture from '../components/CameraCapture'
import { Button, cx, EmptyState, Spinner, useToast } from '../components/ui'

const SORTS: Record<string, { label: string; sort: string; dir: string }> = {
  newest: { label: 'Newest first', sort: 'date', dir: 'desc' }, oldest: { label: 'Oldest first', sort: 'date', dir: 'asc' },
  nameAsc: { label: 'Name A–Z', sort: 'name', dir: 'asc' }, nameDesc: { label: 'Name Z–A', sort: 'name', dir: 'desc' },
  largest: { label: 'Largest', sort: 'size', dir: 'desc' }, smallest: { label: 'Smallest', sort: 'size', dir: 'asc' },
}

export default function Vault() {
  const { folderId } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const fav = params.get('fav') === '1'
  const sortKey = SORTS[params.get('sort') ?? ''] ? (params.get('sort') as string) : 'newest'
  const filtered = q !== '' || fav

  const [detail, setDetail] = useState<FolderDetail | null>(null)
  const [folders, setFolders] = useState<Folder[]>([])
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newFolder, setNewFolder] = useState(false)
  const [camera, setCamera] = useState(false)
  const [dragging, setDragging] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    try {
      const s = SORTS[sortKey]
      const [d, fo, fi] = await Promise.all([
        folderId ? api.folder(folderId) : Promise.resolve(null),
        fav ? Promise.resolve([] as Folder[]) : api.folders(q ? null : folderId ?? null, q || undefined),
        api.files({ folderId: filtered ? undefined : folderId, rootOnly: !folderId && !filtered, q: q || undefined, favorite: fav, sort: s.sort, dir: s.dir }),
      ])
      setDetail(d); setFolders(fo); setFiles(fi); setError('')
    } catch (e) {
      const err = e as Error & { status?: number }
      if (err.status === 404) { toast('That folder no longer exists', 'err'); nav('/vault', { replace: true }) } else setError(err.message)
    } finally { setLoading(false) }
  }, [folderId, q, fav, sortKey, filtered, nav, toast])

  useEffect(() => { setLoading(true); void load() }, [load])

  const { add, panel } = useUploads(folderId ?? null, load)
  const pick = (list: FileList | null) => { if (list?.length) void add(Array.from(list)) }
  const setParam = (k: string, v: string | null) => { const p = new URLSearchParams(params); v ? p.set(k, v) : p.delete(k); setParams(p, { replace: true }) }

  const title = fav ? 'Favorites' : q ? `Results for “${q}”` : detail ? detail.folder.name : 'My Vault'
  const nothing = !loading && folders.length === 0 && files.length === 0

  return (
    <div className="space-y-7"
      onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDragging(true) } }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDragging(false) }}
      onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files) }}>
      {!filtered && (
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-ink/60">
          <Link to="/vault" className="flex items-center gap-1.5 rounded-lg px-1.5 py-1 hover:bg-ink/5 hover:text-ink"><Home className="h-4 w-4" /> My Vault</Link>
          {detail?.breadcrumbs.map((b, i, a) => (
            <span key={b.id} className="flex items-center gap-1"><ChevronRight className="h-4 w-4 text-ink/30" />
              {i === a.length - 1 ? <span aria-current="page" className="px-1.5 font-semibold text-ink">{b.name}</span>
                : <Link to={`/vault/${b.id}`} className="rounded-lg px-1.5 py-1 hover:bg-ink/5 hover:text-ink">{b.name}</Link>}
            </span>
          ))}
        </nav>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl sm:text-4xl">{title}</h1>
        <div className="flex flex-wrap gap-2">
          {!filtered && <Button variant="soft" onClick={() => setNewFolder(true)}><FolderPlus className="h-4 w-4" /> New folder</Button>}
          <Button variant="soft" onClick={() => setCamera(true)}><Camera className="h-4 w-4" /> Take photo</Button>
          <Button onClick={() => input.current?.click()}><Upload className="h-4 w-4" /> Upload</Button>
          <input ref={input} type="file" multiple accept={ACCEPT} className="sr-only" aria-label="Choose files to upload" onChange={(e) => { pick(e.target.files); e.target.value = '' }} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <button onClick={() => setParam('fav', fav ? null : '1')} aria-pressed={fav}
          className={cx('inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors', fav ? 'border-mustard bg-mustard/30' : 'border-ink/15 bg-white hover:bg-cream')}>
          <Star className={cx('h-4 w-4', fav && 'fill-mustard text-mustard-dark')} /> Favorites
        </button>
        {q && <button onClick={() => setParam('q', null)} className="rounded-full border border-ink/15 bg-white px-3.5 py-1.5 text-sm font-medium hover:bg-cream">Clear search ✕</button>}
        <label className="ml-auto flex items-center gap-2 text-sm text-ink/65">Sort
          <select value={sortKey} onChange={(e) => setParam('sort', e.target.value === 'newest' ? null : e.target.value)}
            className="rounded-xl border border-ink/15 bg-white px-3 py-1.5 text-sm text-ink outline-none focus:border-mustard focus:ring-4 focus:ring-mustard/20">
            {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </label>
      </div>

      {error && <p role="alert" className="rounded-2xl bg-terracotta/15 p-4 text-terracotta-deep">{error}</p>}
      {loading ? <Spinner /> : nothing ? (
        filtered ? (
          <EmptyState icon={<SearchX className="h-8 w-8" />} title={fav ? 'No favorites yet' : 'No matches found'}>
            {fav ? 'Tap the star on any file to keep it close at hand.' : 'Try a different word, or check the spelling.'}
          </EmptyState>
        ) : (
          <EmptyState icon={<FilePlus2 className="h-8 w-8" />} title={folderId ? 'This folder is empty' : 'Your vault is empty'}
            action={<><Button variant="soft" onClick={() => setNewFolder(true)}><FolderPlus className="h-4 w-4" /> New folder</Button><Button onClick={() => input.current?.click()}><Upload className="h-4 w-4" /> Upload files</Button></>}>
            Drag files here, upload from your device, or snap a photo of your notes.
          </EmptyState>
        )
      ) : (<>
        {folders.length > 0 && (
          <section aria-label="Folders">
            <h2 className="mb-4 text-lg text-ink/70">Folders</h2>
            <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">{folders.map((f) => <FolderCard key={f.id} folder={f} onChange={load} />)}</div>
          </section>
        )}
        {files.length > 0 && (
          <section aria-label="Files">
            <h2 className="mb-4 text-lg text-ink/70">Files</h2>
            <div className="grid gap-3 md:grid-cols-2">{files.map((f) => <FileCard key={f.id} file={f} onChange={load} showFolder={filtered} />)}</div>
          </section>
        )}
      </>)}

      {dragging && <div className="pointer-events-none fixed inset-3 z-40 grid place-items-center rounded-3xl border-2 border-dashed border-mustard bg-mustard/15 backdrop-blur-[1px]"><p className="rounded-2xl bg-cream px-6 py-4 font-display text-xl shadow-lift">Drop files to upload{detail ? ` to ${detail.folder.name}` : ''}</p></div>}
      {newFolder && <FolderDialog parentId={folderId ?? null} onClose={() => setNewFolder(false)} onDone={load} />}
      {camera && <CameraCapture onClose={() => setCamera(false)} onCapture={(f) => void add([f])} />}
      {panel}
    </div>
  )
}
