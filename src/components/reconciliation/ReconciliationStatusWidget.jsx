/**
 * ReconciliationStatusWidget — Step 3.4 (VF-IMPL-FR01-001)
 *
 * Per bank account: circular progress ring showing matched %,
 * count of unmatched items, age of oldest unmatched, 'Review exceptions' button.
 *
 * Subscribes to WebSocket for real-time score updates (no polling).
 * Ring color: green (100%), amber (90-99%), red (< 90%).
 */
import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import reconciliationApi from '@/services/ai/reconciliationService'

const RECON_WS_BASE = (import.meta.env.VITE_RECONCILIATION_URL ?? 'http://localhost:8004')
  .replace('http', 'ws')

function ScoreRing({ pct }) {
  const r    = 36
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  const color = pct >= 100 ? 'rgb(var(--c-positive))' : pct >= 90 ? 'rgb(var(--c-highlight))' : 'rgb(var(--c-negative))'

  return (
    <svg width="88" height="88" className="-rotate-90">
      <circle cx="44" cy="44" r={r} fill="none" stroke="rgb(var(--c-text) / 0.10)" strokeWidth="8" />
      <circle
        cx="44" cy="44" r={r} fill="none"
        stroke={color} strokeWidth="8"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.5s ease' }}
      />
      <text
        x="44" y="44" textAnchor="middle" dominantBaseline="central"
        className="rotate-90" fill={color}
        style={{ transform: 'rotate(90deg) translate(0px, 0px)', transformOrigin: '44px 44px', fontSize: '14px', fontWeight: 700 }}
      >
        {pct}%
      </text>
    </svg>
  )
}

export default function ReconciliationStatusWidget({ bankAccountId, accountName }) {
  const navigate = useNavigate()
  const [liveScore, setLiveScore] = useState(null)
  const wsRef = useRef(null)

  // Initial fetch
  const { data: score } = useQuery({
    queryKey:  ['recon-score', bankAccountId],
    queryFn:   () => reconciliationApi.getScore(bankAccountId).then(r => r.data),
    staleTime: 60_000,
  })

  const display = liveScore ?? score

  // WebSocket subscription for real-time updates
  useEffect(() => {
    if (!bankAccountId) return
    const ws = new WebSocket(`${RECON_WS_BASE}/v1/ws/recon-score/${bankAccountId}`)
    wsRef.current = ws
    ws.onmessage = (e) => {
      try { setLiveScore(JSON.parse(e.data)) } catch {}
    }
    return () => ws.close()
  }, [bankAccountId])

  if (!display) return (
    <div className="bg-navy-2 rounded-xl border border-glass p-4 h-32 animate-pulse" />
  )

  const pct      = Math.round(display.score_pct ?? 0)
  const unmatched= display.unmatched ?? 0
  const stale    = display.unmatched_7d_plus ?? 0
  const oldest   = display.oldest_unmatched_date

  return (
    <div className="bg-navy-2 rounded-xl border border-glass p-4 flex gap-4 items-center">
      <ScoreRing pct={pct} />

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-text-primary truncate">{accountName}</p>
        <p className="text-xs text-text-muted mt-0.5">
          {display.matched ?? 0} / {display.total ?? 0} matched
        </p>
        {stale > 0 && (
          <p className="text-xs text-negative mt-0.5">
            ⚠ {stale} item{stale > 1 ? 's' : ''} older than 7 days
          </p>
        )}
        {oldest && (
          <p className="text-xs text-text-muted mt-0.5">Oldest: {oldest}</p>
        )}
        <button
          onClick={() => navigate(`/reconciliation/exceptions?account=${bankAccountId}`)}
          className="mt-2 text-xs text-cyan hover:underline"
        >
          Review {unmatched} exception{unmatched !== 1 ? 's' : ''} →
        </button>
      </div>
    </div>
  )
}
