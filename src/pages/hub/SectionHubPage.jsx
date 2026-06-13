import { useMemo } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { hubByKey } from '@/components/layout/nav.config'
import { useDashboardAll } from '@/hooks/useReports'
import { useBusinessStore } from '@/stores/useBusinessStore'
import approvalService from '@/services/approval.service'
import { cn } from '@/utils/cn'

/*
 * SectionHubPage — the "Vault" hub landing page.
 *
 * Driven entirely by nav.config (hubByKey): a serif hero + a grid of module
 * cards for the section. Cards link to the real module routes (unchanged) and
 * surface a cheap live stat where one exists (receivables, payables, pending
 * approvals) — all from caches the dashboard/rail already populate.
 */

/* compact money: Rs 57.2M / Rs 8K / Rs 940 */
function compactMoney(val, currency = 'PKR') {
  const sym = currency === 'PKR' ? 'Rs' : currency === 'USD' ? '$' : currency
  const abs = Math.abs(val || 0)
  const sign = val < 0 ? '−' : ''
  if (abs >= 1_000_000) return `${sign}${sym} ${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}${sym} ${(abs / 1_000).toFixed(0)}K`
  return `${sign}${sym} ${abs.toFixed(0)}`
}

function ModuleCard({ item, accent, stat, index }) {
  return (
    <Link
      to={item.href}
      style={{ animationDelay: `${index * 55}ms` }}
      className="group relative flex flex-col rounded-2xl border border-glass bg-navy-2 p-5 overflow-hidden transition-all duration-200 animate-fade-in hover:-translate-y-0.5"
    >
      {/* Obsidian top-light + section hairline */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, rgb(${accent} / 0.53), transparent)` }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: `radial-gradient(420px 160px at 50% -40%, rgb(${accent} / 0.08), transparent 70%)` }}
      />

      <div className="relative flex items-start justify-between mb-3.5">
        <span
          className="flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105"
          style={{ background: `rgb(${accent} / 0.10)`, boxShadow: `inset 0 0 0 1px rgb(${accent} / 0.20)` }}
        >
          <item.icon className="h-[21px] w-[21px]" style={{ color: `rgb(${accent})` }} />
        </span>
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-glass text-text-muted transition-all duration-200 group-hover:border-glass-2 group-hover:text-text-primary group-hover:translate-x-0.5">
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>

      <h3 className="relative text-[15px] font-semibold text-text-primary leading-tight">{item.name}</h3>
      <p className="relative mt-1 text-[12.5px] leading-snug text-text-muted">{item.desc}</p>

      {stat && (
        <div className="relative mt-4 flex items-baseline gap-1.5 border-t border-glass pt-3">
          <span className="num text-[15px] font-semibold" style={{ color: stat.tint || 'var(--text)' }}>
            {stat.value}
          </span>
          <span className="text-[11px] text-text-muted">{stat.label}</span>
        </div>
      )}
    </Link>
  )
}

export default function SectionHubPage() {
  const { sectionKey } = useParams()
  const section = hubByKey(sectionKey)
  const currency = useBusinessStore((s) => s.currency)

  /* Which cheap stats this section actually needs */
  const needsFinance = useMemo(
    () => !!section?.items.some((i) => i.statKey === 'receivable' || i.statKey === 'payable'),
    [section],
  )
  const needsApprovals = useMemo(
    () => !!section?.items.some((i) => i.statKey === 'approvals'),
    [section],
  )

  const dateRange = useMemo(() => ({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  }), [])

  const { data: dashData } = useDashboardAll(dateRange, { enabled: needsFinance })
  const { data: approvalsPending = 0 } = useQuery({
    queryKey: ['approvals-count'],
    queryFn: () => approvalService.count().then((r) => r.data.data?.pending ?? 0),
    staleTime: 30_000,
    retry: false,
    enabled: needsApprovals,
  })

  if (!section) return <Navigate to="/dashboard" replace />

  const accent = section.accent
  const kpis = dashData?.kpis || {}

  const accentColor = `rgb(${accent})`
  const statFor = (item) => {
    switch (item.statKey) {
      case 'receivable':
        return { value: compactMoney(kpis.accountsReceivable ?? 0, currency), label: 'outstanding', tint: accentColor }
      case 'payable':
        return { value: compactMoney(kpis.accountsPayable ?? 0, currency), label: 'owed', tint: accentColor }
      case 'approvals':
        return approvalsPending > 0
          ? { value: String(approvalsPending), label: 'awaiting sign-off', tint: 'rgb(var(--c-highlight))' }
          : { value: '0', label: 'all clear' }
      default:
        return null
    }
  }

  return (
    <div className="animate-fade-in pb-10">
      {/* ── Hero ── */}
      <div className="mb-7 max-w-2xl">
        <div className="mb-3 flex items-center gap-2.5">
          <span className="h-px w-7" style={{ background: `rgb(${accent} / 0.60)` }} aria-hidden="true" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: accentColor }}>
            {section.label}
          </span>
        </div>
        <div className="flex items-center gap-3.5">
          <span
            className="flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{ background: `rgb(${accent} / 0.10)`, boxShadow: `inset 0 0 0 1px rgb(${accent} / 0.20)` }}
          >
            <section.icon className="h-6 w-6" style={{ color: accentColor }} />
          </span>
          <h1 className="font-display text-[2rem] font-semibold tracking-tight text-text-primary leading-none">
            {section.label}
          </h1>
        </div>
        <p className="mt-4 text-[15px] leading-relaxed text-text-secondary">{section.blurb}</p>
      </div>

      {/* ── Module grid ── */}
      <div className={cn('grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3')}>
        {section.items.map((item, i) => (
          <ModuleCard key={item.href} item={item} accent={accent} stat={statFor(item)} index={i} />
        ))}
      </div>
    </div>
  )
}
