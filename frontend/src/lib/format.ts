import type { FileKind } from './api'

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let v = n / 1024, i = 0
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++ }
  return `${v >= 10 ? v.toFixed(0) : v.toFixed(1)} ${units[i]}`
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const day = 86_400_000
  if (diff < 60_000) return 'Just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`
  if (diff < day) return `${Math.floor(diff / 3_600_000)} h ago`
  if (diff < 7 * day) return `${Math.floor(diff / day)} d ago`
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' })
}

export const FOLDER_COLORS = ['mustard', 'sage', 'terracotta', 'lavender'] as const

// Full class names so Tailwind can see them.
export const folderTone: Record<string, { tab: string; soft: string; text: string; ring: string }> = {
  mustard: { tab: 'bg-mustard', soft: 'bg-mustard/25', text: 'text-mustard-deep', ring: 'ring-mustard' },
  sage: { tab: 'bg-sage', soft: 'bg-sage/30', text: 'text-sage-deep', ring: 'ring-sage' },
  terracotta: { tab: 'bg-terracotta', soft: 'bg-terracotta/25', text: 'text-terracotta-deep', ring: 'ring-terracotta' },
  lavender: { tab: 'bg-lavender', soft: 'bg-lavender/40', text: 'text-lavender-deep', ring: 'ring-lavender' },
}

export const kindTone: Record<FileKind, { bg: string; text: string; label: string }> = {
  pdf: { bg: 'bg-terracotta/20', text: 'text-terracotta-deep', label: 'PDF' },
  image: { bg: 'bg-lavender/40', text: 'text-lavender-deep', label: 'Image' },
  text: { bg: 'bg-mustard/25', text: 'text-mustard-deep', label: 'Text' },
  document: { bg: 'bg-sage/30', text: 'text-sage-deep', label: 'Document' },
  presentation: { bg: 'bg-mustard/25', text: 'text-mustard-deep', label: 'Slides' },
  spreadsheet: { bg: 'bg-sage/30', text: 'text-sage-deep', label: 'Sheet' },
  file: { bg: 'bg-ink/5', text: 'text-ink/70', label: 'File' },
}

export const ACCEPT = '.pdf,.png,.jpg,.jpeg,.gif,.webp,.txt,.md,.csv,.doc,.docx,.ppt,.pptx,.xls,.xlsx'
