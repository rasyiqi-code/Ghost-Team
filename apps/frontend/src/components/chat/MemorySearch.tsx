import { useState, useRef, useCallback, useEffect } from 'react'
import { Search, Loader2, MessageSquare, Ghost, Bot, User, X, SearchX, History } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'

interface MemoryResult {
  content: string
  sender: string
  platform: string
  similarity: number
  createdAt?: string
}

export function MemorySearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<MemoryResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      setQuery('')
      setResults([])
      setSearched(false)
    }
  }, [open])

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      setSearched(false)
      return
    }
    setSearching(true)
    setSearched(true)
    try {
      const res = await api.post<{ results: MemoryResult[] }>('/memory/search', { query: q, top_k: 10 })
      setResults(res.results ?? [])
    } catch {
      setResults([])
    }
    setSearching(false)
  }, [])

  const handleChange = (value: string) => {
    setQuery(value)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(value), 400)
  }

  const platformColor = (p: string) => {
    switch (p) {
      case 'telegram': return 'bg-sky-100 text-sky-700 border-sky-200'
      case 'whatsapp': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
      case 'slack': return 'bg-amber-100 text-amber-700 border-amber-200'
      default: return 'bg-slate-100 text-slate-600 border-slate-200'
    }
  }

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)} title="Search memories (vector)">
        <History className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ghost className="h-5 w-5 text-primary" />
              Memory Search
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => handleChange(e.target.value)}
              placeholder="Search chat memories..."
              className="h-10 flex-1 bg-transparent text-sm outline-none"
            />
            {query && (
              <button onClick={() => { setQuery(''); setResults([]); setSearched(false) }} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto min-h-0 space-y-2 mt-2">
            {searching ? (
              <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Searching memories...</span>
              </div>
            ) : searched && results.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <SearchX className="h-8 w-8" />
                <span className="text-sm">No relevant memories found</span>
              </div>
            ) : results.length > 0 ? (
              results.map((r, i) => (
                <div key={i} className="rounded-lg border border-border p-3 hover:bg-accent/50 transition-colors">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {r.sender === 'ai' || r.sender === 'assistant' ? (
                        <Bot className="h-3.5 w-3.5" />
                      ) : (
                        <User className="h-3.5 w-3.5" />
                      )}
                      <span className="font-medium capitalize">{r.sender}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-[10px] font-medium border ${platformColor(r.platform)}`}>
                        {r.platform}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {(r.similarity * 100).toFixed(0)}% match
                      </span>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed line-clamp-3">{r.content}</p>
                </div>
              ))
            ) : !searched ? (
              <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <MessageSquare className="h-8 w-8" />
                <span className="text-sm text-center">Search across all chat memories using semantic vector search</span>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
