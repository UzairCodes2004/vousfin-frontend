/**
 * GlobalAIWidget — Persistent floating AI Assistant
 *
 * Mounted once in DashboardLayout, lives outside the route tree so
 * conversation history and open/close state survive ALL page navigations.
 *
 * State:
 *  - isOpen       : panel visible or collapsed to FAB
 *  - isFullscreen : expands to cover the viewport
 *
 * Chat messages persist via Zustand (useAIStore) — the store is a singleton
 * so history is never reset by React Router navigations.
 */
import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import {
  BrainCircuit, Send, X, Maximize2, Minimize2,
  Trash2, Bot, User, ChevronDown,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAIStore } from '@/stores/useAIStore'
import { cn } from '@/utils/cn'
import { getErrorMessage } from '@/utils/errorHandler'

const SUGGESTED_PROMPTS = [
  'What is my net profit this month?',
  'How is my cash flow?',
  'What are my top expenses?',
]

/* ── Typing dots indicator ── */
function TypingDots() {
  return (
    <div className="flex gap-1 items-center px-3 py-2.5">
      {['-0.3s', '-0.15s', '0s'].map((delay) => (
        <div
          key={delay}
          className="h-1.5 w-1.5 rounded-full bg-cyan/60 animate-bounce"
          style={{ animationDelay: delay }}
        />
      ))}
    </div>
  )
}

/* ── Message bubble ── */
function Bubble({ m }) {
  const isUser = m.role === 'user'
  return (
    <div className={cn('flex gap-2', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-cyan/20 border border-cyan/30 mt-0.5">
          <Bot className="h-3.5 w-3.5 text-cyan" />
        </div>
      )}
      <div className={cn(
        'max-w-[80%] rounded-xl px-3 py-2 text-xs leading-relaxed',
        isUser
          ? 'bg-cyan text-navy font-medium rounded-tr-sm'
          : 'bg-glass-panel border border-glass text-text-primary rounded-tl-sm',
      )}>
        {isUser ? m.content : (
          <ReactMarkdown
            components={{
              p:      ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
              strong: ({ children }) => <strong className="font-bold text-cyan">{children}</strong>,
              ul:     ({ children }) => <ul className="list-disc list-inside space-y-0.5 mt-0.5">{children}</ul>,
              li:     ({ children }) => <li className="text-text-secondary">{children}</li>,
              code:   ({ children }) => <code className="bg-glass rounded px-1 font-mono text-cyan">{children}</code>,
            }}
          >
            {m.content}
          </ReactMarkdown>
        )}
      </div>
      {isUser && (
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-glass-panel border border-glass mt-0.5">
          <User className="h-3.5 w-3.5 text-text-muted" />
        </div>
      )}
    </div>
  )
}

export default function GlobalAIWidget() {
  const [isOpen, setIsOpen]             = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [input, setInput]               = useState('')
  const bottomRef                       = useRef(null)
  const inputRef                        = useRef(null)

  const { messages, loading, sendMessage, clearChat } = useAIStore()

  /* Auto-scroll on new messages */
  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  /* Focus input when panel opens */
  useEffect(() => {
    if (isOpen && !isFullscreen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen, isFullscreen])

  /* Close fullscreen on Escape */
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        if (isFullscreen) setIsFullscreen(false)
        else if (isOpen) setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isFullscreen, isOpen])

  const submit = async (text) => {
    const q = (text ?? input).trim()
    if (!q) return
    setInput('')
    try {
      await sendMessage(q)
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setIsFullscreen(false)
  }

  /* ── Collapsed FAB ─────────────────────────────────────────────────── */
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-[60] flex items-center gap-2 rounded-full bg-cyan text-navy px-4 py-3 shadow-lg shadow-cyan/25 hover:bg-cyan/90 active:scale-95 transition-all duration-150 font-semibold text-sm select-none"
        aria-label="Open AI Assistant"
      >
        <BrainCircuit className="h-5 w-5 flex-shrink-0" />
        <span className="hidden sm:inline">AI Assistant</span>
      </button>
    )
  }

  /* ── Panel dimensions ──────────────────────────────────────────────── */
  const panelCls = isFullscreen
    ? 'fixed inset-0 z-[60] flex flex-col bg-navy'
    : 'fixed bottom-6 right-6 z-[60] w-[380px] max-w-[calc(100vw-1.5rem)] h-[520px] flex flex-col rounded-2xl shadow-2xl shadow-black/40 border border-glass bg-charcoal overflow-hidden'

  return (
    <div className={panelCls}>

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-glass bg-charcoal flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan/20 border border-cyan/30">
            <Bot className="h-4 w-4 text-cyan" />
          </div>
          <div>
            <p className="text-sm font-bold text-text-primary leading-tight">vousFin AI</p>
            <p className="text-[10px] text-text-muted leading-tight">Gemini Flash · Live data</p>
          </div>
        </div>

        <div className="flex items-center gap-0.5">
          {/* Clear */}
          <button
            onClick={clearChat}
            className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
            title="Clear conversation"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={() => setIsFullscreen(f => !f)}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-glass-hover transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen
              ? <Minimize2 className="h-3.5 w-3.5" />
              : <Maximize2 className="h-3.5 w-3.5" />}
          </button>

          {/* Collapse to FAB */}
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-glass-hover transition-colors"
            title="Minimise"
          >
            <ChevronDown className="h-4 w-4" />
          </button>

          {/* Close (hides widget) */}
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-glass-hover transition-colors"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Messages area ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">

        {/* Empty state — show suggested prompts */}
        {messages.length === 0 && (
          <div className="space-y-3 pt-2">
            <p className="text-xs text-text-muted text-center">
              Ask me anything about your finances:
            </p>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {SUGGESTED_PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => submit(p)}
                  className="rounded-full border border-glass bg-glass-panel px-2.5 py-1 text-[11px] text-text-secondary hover:border-cyan/40 hover:text-text-primary hover:bg-glass-hover transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message bubbles */}
        {messages.map((m) => (
          <Bubble key={m.id} m={m} />
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex gap-2 justify-start">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-cyan/20 border border-cyan/30">
              <Bot className="h-3.5 w-3.5 text-cyan animate-pulse" />
            </div>
            <div className="rounded-xl rounded-tl-sm bg-glass-panel border border-glass">
              <TypingDots />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input bar ─────────────────────────────────────────────────── */}
      <form
        className="flex gap-2 border-t border-glass p-3 flex-shrink-0 bg-charcoal"
        onSubmit={(e) => { e.preventDefault(); submit() }}
      >
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your finances…"
          disabled={loading}
          className="flex-1 rounded-xl border border-glass bg-glass-panel px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-cyan/50 focus:outline-none focus:ring-1 focus:ring-cyan/20 disabled:opacity-50 transition-colors"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-cyan text-navy hover:bg-cyan/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Send"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  )
}
