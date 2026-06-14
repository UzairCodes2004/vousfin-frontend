/**
 * DeadlineCountdown — a compact, urgency-aware deadline pill (FR-04.1).
 * "Due in 4 days · 18 Jun" with colour that escalates as the date nears.
 */
import { CalendarClock } from 'lucide-react'
import { formatDate } from '@/utils/formatters'
import { deadlineTone, deadlinePhrase } from './taxFormat'
import { cn } from '@/utils/cn'

export default function DeadlineCountdown({ deadline, className, muted = false }) {
  if (!deadline || deadline.daysRemaining == null) {
    return (
      <span className={cn('inline-flex items-center gap-1.5 text-[12.5px] text-text-muted', className)}>
        <CalendarClock className="h-3.5 w-3.5" />
        No filing deadline
      </span>
    )
  }

  // `muted` calms the urgency colour when nothing is actually owed — a Rs 0
  // liability shouldn't scream red just because its filing date is near.
  const tone = muted
    ? { text: 'text-text-muted', dot: 'bg-text-muted', chip: 'bg-glass-panel border-glass' }
    : deadlineTone(deadline.daysRemaining)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12.5px] font-semibold',
        tone.chip, tone.text, className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', tone.dot, !muted && deadline.daysRemaining <= 3 && 'animate-pulse')} />
      {deadlinePhrase(deadline.daysRemaining)}
      {deadline.dueDate && (
        <span className="font-medium opacity-70">· {formatDate(deadline.dueDate, 'd MMM')}</span>
      )}
    </span>
  )
}
