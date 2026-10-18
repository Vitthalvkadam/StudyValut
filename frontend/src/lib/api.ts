const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? ''

export type User = { id: string; email: string; displayName: string; createdAt: string }
export type Folder = { id: string; parentId: string | null; name: string; color: string; fileCount: number; folderCount: number; createdAt: string }
export type FolderDetail = { folder: Folder; breadcrumbs: Folder[] }
export type FileKind = 'pdf' | 'image' | 'text' | 'document' | 'presentation' | 'spreadsheet' | 'file'
export type FileItem = {
  id: string; folderId: string | null; folderName: string | null; name: string; contentType: string
  kind: FileKind; size: number; favorite: boolean; createdAt: string; updatedAt: string
}
export type Dashboard = {
  fileCount: number; folderCount: number; favoriteCount: number; storageUsed: number; storageQuota: number
  recentFiles: FileItem[]; folders: Folder[]
}
export type Conversation = { id: string; title: string; updatedAt: string }
export type ChatMessage = { id: string; role: 'user' | 'model'; content: string; attachmentName: string | null; createdAt: string }
export type ChatReply = { userMessage: ChatMessage; assistantMessage: ChatMessage; conversation: Conversation }

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) { super(message); this.status = status }
}

function csrfToken(): string {
  const m = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/)
  return m ? decodeURIComponent(m[1]) : ''
}

async function ensureCsrf() {
  if (!csrfToken()) await fetch(`${BASE}/api/auth/csrf`, { credentials: 'include' }).catch(() => undefined)
}

async function parseError(res: Response): Promise<ApiError> {
  let msg = 'Something went wrong. Please try again.'
  try { const j = await res.json(); if (j?.message) msg = j.message } catch { /* non-JSON error */ }
  return new ApiError(res.status, msg)
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {}
  let payload: BodyInit | undefined
  if (body instanceof FormData) payload = body
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body) }
  if (method !== 'GET') { await ensureCsrf(); headers['X-XSRF-TOKEN'] = csrfToken() }
  let res: Response
  try {
    res = await fetch(`${BASE}/api${path}`, { method, headers, body: payload, credentials: 'include' })
  } catch {
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.")
  }
  if (!res.ok) {
    const err = await parseError(res)
    if (res.status === 401 && !path.startsWith('/auth/')) window.dispatchEvent(new Event('sv:unauthorized'))
    throw err
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T)
}

const q = (o: Record<string, string | number | boolean | undefined | null>) => {
  const p = new URLSearchParams()
  Object.entries(o).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '' && v !== false) p.set(k, String(v)) })
  const s = p.toString()
  return s ? `?${s}` : ''
}

export const fileUrl = (id: string, kind: 'content' | 'download') => `${BASE}/api/files/${id}/${kind}`

export const api = {
  me: () => request<User>('GET', '/auth/me'),
  login: (email: string, password: string) => request<User>('POST', '/auth/login', { email, password }),
  register: (displayName: string, email: string, password: string) => request<User>('POST', '/auth/register', { displayName, email, password }),
  logout: () => request<void>('POST', '/auth/logout'),
  updateProfile: (displayName: string, email: string) => request<User>('PATCH', '/account/profile', { displayName, email }),
  changePassword: (currentPassword: string, newPassword: string) => request<void>('POST', '/account/password', { currentPassword, newPassword }),
  deleteAccount: (password: string) => request<void>('DELETE', '/account', { password }),

  dashboard: () => request<Dashboard>('GET', '/dashboard'),

  folders: (parentId?: string | null, search?: string) => request<Folder[]>('GET', `/folders${q({ parentId, q: search })}`),
  allFolders: () => request<Folder[]>('GET', '/folders/all'),
  folder: (id: string) => request<FolderDetail>('GET', `/folders/${id}`),
  createFolder: (name: string, parentId: string | null, color: string) => request<Folder>('POST', '/folders', { name, parentId, color }),
  updateFolder: (id: string, name: string, color: string) => request<Folder>('PATCH', `/folders/${id}`, { name, color }),
  deleteFolder: (id: string) => request<void>('DELETE', `/folders/${id}`),

  files: (o: { folderId?: string | null; rootOnly?: boolean; q?: string; favorite?: boolean; sort?: string; dir?: string }) =>
    request<FileItem[]>('GET', `/files${q(o)}`),
  file: (id: string) => request<FileItem>('GET', `/files/${id}`),
  renameFile: (id: string, name: string) => request<FileItem>('PATCH', `/files/${id}`, { name }),
  moveFile: (id: string, folderId: string | null) => request<FileItem>('PUT', `/files/${id}/folder`, { folderId }),
  favoriteFile: (id: string, favorite: boolean) => request<FileItem>('PUT', `/files/${id}/favorite`, { favorite }),
  deleteFile: (id: string) => request<void>('DELETE', `/files/${id}`),
  fileText: async (id: string) => {
    const res = await fetch(fileUrl(id, 'content'), { credentials: 'include' })
    if (!res.ok) throw await parseError(res)
    return (await res.text()).slice(0, 200_000)
  },

  chatStatus: () => request<{ configured: boolean }>('GET', '/chat/status'),
  conversations: () => request<Conversation[]>('GET', '/chat/conversations'),
  createConversation: () => request<Conversation>('POST', '/chat/conversations'),
  conversation: (id: string) => request<{ conversation: Conversation; messages: ChatMessage[] }>('GET', `/chat/conversations/${id}`),
  deleteConversation: (id: string) => request<void>('DELETE', `/chat/conversations/${id}`),
  sendMessage: (id: string, text: string, attachment?: File | null, vaultFileId?: string | null) => {
    const f = new FormData()
    if (text) f.set('text', text)
    if (attachment) f.set('attachment', attachment)
    if (vaultFileId) f.set('vaultFileId', vaultFileId)
    return request<ChatReply>('POST', `/chat/conversations/${id}/messages`, f)
  },
}

/** Upload with progress (fetch cannot report upload progress, XHR can). */
export async function uploadFile(file: File, folderId: string | null, onProgress: (pct: number) => void): Promise<FileItem> {
  await ensureCsrf()
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${BASE}/api/files${folderId ? `?folderId=${folderId}` : ''}`)
    xhr.withCredentials = true
    xhr.setRequestHeader('X-XSRF-TOKEN', csrfToken())
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)) }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve(JSON.parse(xhr.responseText) as FileItem)
      let msg = 'Upload failed. Please try again.'
      try { msg = JSON.parse(xhr.responseText).message || msg } catch { /* ignore */ }
      if (xhr.status === 401) window.dispatchEvent(new Event('sv:unauthorized'))
      reject(new ApiError(xhr.status, msg))
    }
    xhr.onerror = () => reject(new ApiError(0, "Can't reach the server. Check your connection and try again."))
    const form = new FormData()
    form.set('file', file, file.name)
    xhr.send(form)
  })
}
