import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { Send, Bot, User, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import Button from '@/components/ui/Button'
import { useAIStore } from '@/stores/useAIStore'
import { getErrorMessage } from '@/utils/errorHandler'

const SUGGESTED_PROMPTS = [
  'What is my net profit this month?',
  'Why are my expenses so high?',
  'How is my cash flow this month?',
  'What are my highest expense accounts?',
  'Is my business growing?',
  'What financial risks should I be aware of?',
]

export default function AIAssistantChat() {
  const { messages, loading, sendMessage, clearChat } = useAIStore()
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const submit = async (text) => {
    const q = text || input
    if (!q.trim()) return
    setInput('')
    try {
      await sendMessage(q.trim())
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col premium-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-glass px-5 py-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan/20 border border-cyan/30">
            <Bot className="h-5 w-5 text-cyan" />
          </div>
          <div>
            <h3 className="font-bold text-text-primary text-sm">vousFin AI Assistant</h3>
            <p className="text-xs text-text-muted">Powered by Gemini Flash · Live Financial Data</p>
          </div>
        </div>
        <button
          type="button"
          onClick={clearChat}
          className="flex items-center gap-1.5 text-xs text-text-muted hover:text-negative transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Clear
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin">
        {messages.length === 0 && (
          <div className="space-y-4">
            <p className="text-sm text-text-muted text-center pt-4">
              Ask me anything about your financial data. Try one of these:
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTED_PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => submit(p)}
                  className="rounded-full border border-glass bg-glass-panel px-3 py-1.5 text-xs text-text-secondary hover:border-cyan/40 hover:text-text-primary hover:bg-glass-hover transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-cyan/20 border border-cyan/30">
                <Bot className="h-4 w-4 text-cyan" />
              </div>
            )}

            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              m.role === 'user'
                ? 'bg-cyan text-navy font-medium rounded-tr-sm'
                : 'bg-glass-panel border border-glass text-text-primary rounded-tl-sm'
            }`}>
              {m.role === 'assistant' ? (
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                    strong: ({ children }) => <strong className="font-bold text-cyan">{children}</strong>,
                    ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mt-1">{children}</ul>,
                    li: ({ children }) => <li className="text-text-secondary">{children}</li>,
                  }}
                >
                  {m.content}
                </ReactMarkdown>
              ) : (
                m.content
              )}
            </div>

            {m.role === 'user' && (
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-glass-panel border border-glass">
                <User className="h-4 w-4 text-text-muted" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-cyan/20 border border-cyan/30">
              <Bot className="h-4 w-4 text-cyan animate-pulse" />
            </div>
            <div className="rounded-2xl rounded-tl-sm bg-glass-panel border border-glass px-4 py-3 flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-cyan/60 animate-bounce [animation-delay:-0.3s]" />
              <div className="h-1.5 w-1.5 rounded-full bg-cyan/60 animate-bounce [animation-delay:-0.15s]" />
              <div className="h-1.5 w-1.5 rounded-full bg-cyan/60 animate-bounce" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        className="flex gap-3 border-t border-glass p-4 flex-shrink-0"
        onSubmit={(e) => { e.preventDefault(); submit() }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your finances..."
          disabled={loading}
          className="flex-1 rounded-xl border border-glass bg-glass-panel px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-cyan/50 focus:outline-none focus:ring-1 focus:ring-cyan/20 disabled:opacity-50 transition-colors"
        />
        <Button type="submit" loading={loading} icon={Send} disabled={loading || !input.trim()}>
          Send
        </Button>
      </form>
    </div>
  )
}
