import { useEffect, useRef, useState } from 'react'
import { Camera, RefreshCw } from 'lucide-react'
import { ACCEPT } from '../lib/format'
import { Button, Modal } from './ui'

/** Live camera via getUserMedia (needs HTTPS or localhost). Falls back to the phone's native camera picker. */
export default function CameraCapture({ onCapture, onClose }: { onCapture: (file: File) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const [shot, setShot] = useState<{ blob: Blob; url: string } | null>(null)
  const hasCamera = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

  const start = async () => {
    setError(''); setReady(false)
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      if (video.current) { video.current.srcObject = stream.current; await video.current.play(); setReady(true) }
    } catch {
      setError('Camera access was blocked or no camera was found. Allow camera permission in your browser, or pick a photo instead.')
    }
  }
  const stop = () => { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null }

  useEffect(() => { if (hasCamera) void start(); return stop /* eslint-disable-next-line */ }, [])
  useEffect(() => () => { if (shot) URL.revokeObjectURL(shot.url) }, [shot])

  const snap = () => {
    const v = video.current
    if (!v || !v.videoWidth) return
    const c = document.createElement('canvas')
    c.width = v.videoWidth; c.height = v.videoHeight
    c.getContext('2d')!.drawImage(v, 0, 0)
    c.toBlob((b) => { if (b) { setShot({ blob: b, url: URL.createObjectURL(b) }); stop() } }, 'image/jpeg', 0.9)
  }
  const retake = () => { setShot(null); void start() }
  const save = () => {
    if (!shot) return
    const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')
    onCapture(new File([shot.blob], `photo-${stamp}.jpg`, { type: 'image/jpeg' }))
    onClose()
  }

  return (
    <Modal title="Take a photo" onClose={() => { stop(); onClose() }}>
      {hasCamera && !error ? (
        <div className="overflow-hidden rounded-2xl bg-ink">
          {shot ? <img src={shot.url} alt="Captured photo preview" className="aspect-[4/3] w-full object-contain" />
            : <video ref={video} playsInline muted className="aspect-[4/3] w-full object-cover" />}
        </div>
      ) : (
        <div className="space-y-4">
          {error && <p className="rounded-xl bg-terracotta/15 p-3 text-sm text-terracotta-deep">{error}</p>}
          {!hasCamera && <p className="text-sm text-ink/70">Live camera needs a secure (HTTPS) connection. You can still take a photo with your device’s camera:</p>}
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-mustard px-4 py-3 text-sm font-semibold shadow-card hover:bg-mustard-dark">
            <Camera className="h-4 w-4" /> Open camera or choose photo
            <input type="file" accept={ACCEPT.split(',').filter((x) => /png|jpe?g|webp|gif/.test(x)).join(',')} capture="environment" className="sr-only"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) { onCapture(f); onClose() } }} />
          </label>
        </div>
      )}
      {hasCamera && !error && (
        <div className="mt-5 flex justify-end gap-2">
          {shot ? (<><Button variant="soft" onClick={retake}><RefreshCw className="h-4 w-4" /> Retake</Button><Button onClick={save}>Save to this folder</Button></>)
            : <Button onClick={snap} disabled={!ready}><Camera className="h-4 w-4" /> Capture</Button>}
        </div>
      )}
    </Modal>
  )
}
