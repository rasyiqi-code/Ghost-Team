import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useRef, useCallback, useEffect, type DragEvent } from 'react'
import { Folder, FileText, Download, Upload, Loader2, X, FileImage, FileType as FileTypeIcon, AlertCircle, Search, SearchX, TriangleAlert } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { File as FileType } from '@/types'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB

const FOLDER_COLORS: Record<string, string> = {
  Kontrak: 'text-red-500',
  Desain: 'text-pink-500',
  Dokumen_Teknis: 'text-blue-500',
  Laporan: 'text-green-500',
  Lainnya: 'text-gray-500',
}

const DEFAULT_COLOR = 'text-gray-500'

function isImage(mime: string): boolean {
  return mime.startsWith('image/')
}

function isPdf(mime: string): boolean {
  return mime === 'application/pdf'
}

export function KnowledgeVault({ collapsed }: { collapsed?: boolean }) {
  const queryClient = useQueryClient()
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [previewFile, setPreviewFile] = useState<FileType | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Cleanup debounce on unmount
  useEffect(() => () => clearTimeout(debounceRef.current), [])

  const { data: files = [], isLoading, isError } = useQuery<FileType[]>({
    queryKey: ['files'],
    queryFn: () => api.get('/files', { silent: true }),
  })

  // Search results — enabled only when searchQuery has text
  const { data: searchResults = [], isFetching: isSearching } = useQuery<FileType[]>({
    queryKey: ['files-search', searchQuery],
    queryFn: () => api.post('/files/search', { query: searchQuery, limit: 20 }, { silent: true }),
    enabled: searchQuery.length > 0,
  })

  const handleSearchChange = useCallback((value: string) => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setSearchQuery(value), 300)
  }, [])

  const clearSearch = useCallback(() => {
    setSearchQuery('')
    setShowSearch(false)
    if (searchInputRef.current) searchInputRef.current.value = ''
  }, [])

  const doUpload = async (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      setUploadError(`File too large (max 50 MB)`)
      return
    }
    setUploadError('')
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      await api.post('/files/upload', formData)
      queryClient.invalidateQueries({ queryKey: ['files'] })
    } catch (err) {
      console.error('Upload failed:', err)
    } finally {
      setUploading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    doUpload(file)
    e.target.value = ''
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) doUpload(file)
  }

  const folders = files.reduce<Record<string, FileType[]>>((acc, file) => {
    const folder = file.folder || 'Lainnya'
    if (!acc[folder]) acc[folder] = []
    acc[folder].push(file)
    return acc
  }, {})

  return (
    <aside className={cn(
      "flex w-72 flex-col border-l border-border bg-card transition-all duration-300 overflow-hidden shrink-0",
      collapsed && "w-0 border-l-0"
    )}>
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        {showSearch ? (
          <div className="flex items-center gap-2 w-full">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Cari file via semantic..."
              className="h-7 flex-1 rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:border-ring"
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') clearSearch()
              }}
              autoFocus
            />
            <button
              onClick={clearSearch}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-foreground tracking-tight text-sm">Knowledge Vault</h2>
              <span className="text-[10px] text-muted-foreground">max 50 MB</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowSearch(true)}
                className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title="Semantic search"
              >
                <Search className="h-3.5 w-3.5" />
              </button>
              <label className="cursor-pointer">
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <Upload className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={uploading}
                  accept=".pdf,.doc,.docx,.txt,.csv,.md,.png,.jpg,.jpeg,.gif,.webp,.mp3,.wav,.ogg,.mp4,.webm"
                />
              </label>
            </div>
          </>
        )}
        {uploadError && (
          <div className="flex items-center gap-1.5 border-b border-border px-4 py-1.5 text-[11px] text-rose-600 bg-rose-50/50">
            <TriangleAlert className="h-3 w-3 shrink-0" />
            <span>{uploadError}</span>
            <button className="ml-auto" onClick={() => setUploadError('')}><X className="h-3 w-3" /></button>
          </div>
        )}
      </div>

      {previewFile && (
        <div className="border-b border-border p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium truncate">{previewFile.originalName}</span>
            <button onClick={() => setPreviewFile(null)} className="text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" />
            </button>
          </div>
          {isImage(previewFile.fileType) ? (
            <img
              src={`/api/files/download/${previewFile.id}`}
              alt={previewFile.originalName}
              className="max-h-48 w-full object-contain rounded border"
            />
          ) : isPdf(previewFile.fileType) ? (
            <iframe
              src={`/api/files/download/${previewFile.id}`}
              className="w-full h-48 rounded border"
              title={previewFile.originalName}
            />
          ) : (
            <div className="flex items-center justify-center h-24 text-muted-foreground text-xs border rounded">
              <FileTypeIcon className="h-8 w-8 mr-2" />
              Preview tidak tersedia
            </div>
          )}
          <a
            href={`/api/files/download/${previewFile.id}`}
            download
            className="flex items-center justify-center gap-1 mt-2 text-xs text-primary hover:underline"
          >
            <Download className="h-3 w-3" /> Download
          </a>
        </div>
      )}

      <ScrollArea
        className="flex-1"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div
          className={'p-3 min-h-full transition-colors' + (dragOver ? ' bg-primary/10 border-2 border-dashed border-primary rounded' : '')}
        >
          {dragOver && (
            <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
              <Upload className="h-5 w-5 mr-2" /> Lepaskan file di sini
            </div>
          )}

          {isLoading ? (
            <div className="p-3 space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i}>
                  <div className="flex items-center gap-2 mb-2">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-6 rounded-full" />
                  </div>
                  <div className="ml-6 space-y-1">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center gap-2 p-6 text-muted-foreground">
              <AlertCircle className="h-5 w-5" />
              <span className="text-xs">Gagal memuat vault</span>
            </div>
          ) : searchQuery ? (
            <div className="p-3">
              {isSearching ? (
                <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-xs">Mencari...</span>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
                  <SearchX className="h-5 w-5" />
                  <span className="text-xs text-center">
                    Tidak ditemukan hasil untuk &quot;{searchQuery}&quot;
                  </span>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground mb-2">
                    {searchResults.length} hasil untuk &quot;{searchQuery}&quot;
                  </p>
                  {searchResults.map((file) => (
                    <div
                      key={file.id}
                      className="rounded-lg border border-border p-2 hover:bg-accent/50 cursor-pointer transition-colors"
                      onClick={() => setPreviewFile(file)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {isImage(file.fileType) ? (
                          <FileImage className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        ) : (
                          <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        )}
                        <span className="text-xs font-medium truncate flex-1">
                          {file.originalName}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {file.folder}
                        </Badge>
                      </div>
                      {file.extractedText && (
                        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">
                          {file.extractedText}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : Object.keys(folders).length === 0 && !dragOver ? (
            <p className="text-sm text-muted-foreground p-4 text-center">
              Belum ada file. Upload file atau tunggu file dari chat otomatis terindeks.
            </p>
          ) : (
            Object.entries(folders).map(([folderName, folderFiles]) => (
              <div key={folderName} className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Folder
                    className={'h-4 w-4 ' + (FOLDER_COLORS[folderName] || DEFAULT_COLOR)}
                  />
                  <span className="text-sm font-medium">{folderName}</span>
                  <Badge variant="secondary" className="text-xs">
                    {folderFiles.length}
                  </Badge>
                </div>
                <div className="ml-6 space-y-1">
                  {folderFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-2 rounded px-2 py-1 hover:bg-accent cursor-pointer"
                      onClick={() => setPreviewFile(file)}
                    >
                      {isImage(file.fileType) ? (
                        <FileImage className="h-3 w-3 text-muted-foreground shrink-0" />
                      ) : (
                        <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                      )}
                      <span className="text-xs truncate flex-1">
                        {file.originalName}
                      </span>
                      <a
                        href={'/api/files/download/' + file.id}
                        download
                        className="text-muted-foreground hover:text-foreground"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Download className="h-3 w-3" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </aside>
  )
}
