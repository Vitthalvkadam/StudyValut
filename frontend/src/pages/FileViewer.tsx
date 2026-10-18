import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Download, FileQuestion, Sparkles, Star } from 'lucide-react'
import { api, fileUrl, type FileItem } from '../lib/api'
import { formatBytes, formatDate, kindTone } from '../lib/format'
import { KindTile, useFileActions } from '../components/FileCard'
import { Button, cx, Menu, Spinner } from '../components/ui'

function Preview({ file }: { file: FileItem }) {
  const [text, setText] = useState<string | null>(null)
  const [err, setErr] = useState('')
  useEffect(() => { if (file.kind === 'text') api.fileText(file.id).then(setText).catch((e) => setErr(e.message)) }, [file.id, file.kind])
  const src = fileUrl(file.id, 'content')
  if (file.kind === 'image') return <div className="grid place-items-center rounded-3xl bg-white p-3 shadow-card"><img src={src} alt={file.name} className="max-h-[75dvh] w-auto max-w-full rounded-2xl object-contain" /></div>
  if (file.kind === 'pdf') return <iframe title={file.name} src={src} className="h-[78dvh] w-full rounded-3xl border border-ink/10 bg-white shadow-card" />
  if (file.kind === 'text') {
    if (err) return <p role="alert" className="rounded-2xl bg-terracotta/15 p-4 text-terracotta-deep">{err}</p>
    return text === null ? <Spinner /> : <pre className="max-h-[75dvh] overflow-auto whitespace-pre-wrap break-words rounded-3xl bg-white p-6 font-mono text-sm leading-relaxed shadow-card">{text}</pre>
  }
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-ink/20 bg-cream/70 px-6 py-16 text-center">
      <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-ink/5"><FileQuestion className="h-8 w-8 text-ink/55" /></div>
      <h3 className="text-xl">No preview for {kindTone[file.kind].label.toLowerCase()} files</h3>
      <p className="mt-1.5 max-w-sm text-[15px] text-ink/65">Download it to open in Word, PowerPoint, or Excel.</p>
      <a href={fileUrl(file.id, 'download')} className="mt-5"><Button><Download className="h-4 w-4" /> Download</Button></a>
    </div>
  )
}

export default function FileViewer() {
  const { id } = useParams()
  const nav = useNavigate()
  const [file, setFile] = useState<FileItem | null>(null)
  const [error, setError] = useState('')
  const load = useCallback(() => { if (id) api.file(id).then(setFile).catch((e) => setError(e.message)) }, [id])
  useEffect(load, [load])
  const back = file?.folderId ? `/vault/${file.folderId}` : '/vault'
  const placeholder: FileItem = file ?? ({ id: '', name: '', favorite: false, kind: 'file' } as FileItem)
  const { items, dialogs, toggleFav } = useFileActions(placeholder, () => { if (file) { api.file(file.id).then(setFile).catch(() => nav('/vault', { replace: true })) } })

  if (error) return (
    <div className="space-y-4"><Link to="/vault" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink/70"><ArrowLeft className="h-4 w-4" /> Back to vault</Link>
      <p role="alert" className="rounded-2xl bg-terracotta/15 p-4 text-terracotta-deep">{error === 'File not found' ? 'We couldn’t find that file. It may have been deleted.' : error}</p></div>
  )
  if (!file) return <Spinner />

  return (
    <div className="space-y-5">
      <Link to={back} className="inline-flex items-center gap-1.5 text-sm font-medium text-ink/70 hover:text-ink"><ArrowLeft className="h-4 w-4" /> {file.folderName ?? 'My Vault'}</Link>
      <div className="flex flex-wrap items-center gap-4">
        <KindTile kind={file.kind} size="lg" />
        <div className="min-w-0 flex-1"><h1 className="break-words text-2xl sm:text-3xl">{file.name}</h1>
          <p className="mt-1 text-sm text-ink/60">{kindTone[file.kind].label} · {formatBytes(file.size)} · Added {formatDate(file.createdAt)}</p></div>
        <div className="flex items-center gap-2">
          <button onClick={toggleFav} aria-label={file.favorite ? 'Remove from favorites' : 'Add to favorites'} aria-pressed={file.favorite} className="rounded-xl border border-ink/10 bg-white p-2.5 hover:bg-cream">
            <Star className={cx('h-5 w-5', file.favorite && 'fill-mustard text-mustard-dark')} /></button>
          {(file.kind === 'pdf' || file.kind === 'image') && <Link to={`/assistant?file=${file.id}`}><Button variant="soft"><Sparkles className="h-4 w-4" /> <span className="hidden sm:inline">Ask the assistant</span><span className="sm:hidden">Ask</span></Button></Link>}
          <a href={fileUrl(file.id, 'download')}><Button><Download className="h-4 w-4" /> <span className="hidden sm:inline">Download</span></Button></a>
          <Menu items={items.filter((i) => ['Rename', 'Move', 'Delete'].includes(i.label))} />
        </div>
      </div>
      <Preview file={file} />
      {dialogs}
    </div>
  )
}
