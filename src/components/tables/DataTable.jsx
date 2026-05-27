import { ArrowDown, ArrowUp, ArrowUpDown, Inbox } from 'lucide-react'
import { cn } from '@/utils/cn'

/**
 * DataTable — ERP-grade data table.
 *
 * Backward-compatible column API:
 *   - key            : string  — row[key] is rendered when render() is absent
 *   - header         : string | ReactNode
 *   - render(row, i) : optional cell renderer
 *   - className      : header-cell class
 *   - cellClassName  : body-cell class
 *
 * New (all opt-in):
 *   - sortable       : boolean  — adds sort UI to the header
 *   - sortKey        : string   — override the field used for sorting (defaults to `key`)
 *   - align          : 'left' | 'right' | 'center'  — alignment helper applied to header + body cell
 *
 * New props:
 *   - sortBy, sortOrder ('asc'|'desc'), onSort(sortKey)  — controlled sorting
 *   - stickyHeader   : boolean — header sticks while body scrolls
 *   - zebra          : boolean — alternating row backgrounds
 *   - dense          : boolean — tighter padding (px-4 py-2.5 vs px-6 py-4)
 *   - getRowKey(row,i)         — custom row key
 *   - emptyState     : ReactNode — full custom empty UI (overrides emptyMessage)
 *   - emptyIcon      : Icon component for default empty state
 */
export default function DataTable({
  columns,
  data,
  isLoading,
  emptyMessage = 'No data available',
  emptyState,
  emptyIcon: EmptyIcon = Inbox,
  onRowClick,
  className,
  sortBy,
  sortOrder = 'desc',
  onSort,
  stickyHeader = false,
  zebra = false,
  dense = false,
  getRowKey,
  loadingRowCount = 5,
}) {
  const alignClass = (a) =>
    a === 'right'  ? 'text-right'
    : a === 'center' ? 'text-center'
    : 'text-left'

  const cellPad   = dense ? 'px-4 py-2.5' : 'px-6 py-4'
  const headerPad = dense ? 'px-4 py-3'   : 'px-6 py-4'

  const renderSortIcon = (col) => {
    if (!col.sortable) return null
    const active = sortBy && sortBy === (col.sortKey || col.key)
    if (!active) return <ArrowUpDown className="ml-1.5 inline-block h-3 w-3 opacity-40" />
    return sortOrder === 'asc'
      ? <ArrowUp   className="ml-1.5 inline-block h-3 w-3 text-cyan" />
      : <ArrowDown className="ml-1.5 inline-block h-3 w-3 text-cyan" />
  }

  const handleHeaderClick = (col) => {
    if (!col.sortable || !onSort) return
    onSort(col.sortKey || col.key)
  }

  return (
    <div className={cn('w-full overflow-x-auto scrollbar-thin', className)}>
      <table className="min-w-full text-left text-sm text-text-secondary">
        <thead
          className={cn(
            'bg-glass-panel text-xs uppercase text-text-muted',
            stickyHeader && 'sticky top-0 z-10'
          )}
        >
          <tr>
            {columns.map((col, i) => (
              <th
                key={col.key || i}
                onClick={() => handleHeaderClick(col)}
                aria-sort={
                  col.sortable && sortBy === (col.sortKey || col.key)
                    ? (sortOrder === 'asc' ? 'ascending' : 'descending')
                    : col.sortable ? 'none' : undefined
                }
                className={cn(
                  'whitespace-nowrap font-bold tracking-wider border-b border-glass',
                  headerPad,
                  alignClass(col.align),
                  col.sortable && onSort && 'cursor-pointer select-none hover:text-text-secondary transition-colors',
                  col.className
                )}
              >
                <span className="inline-flex items-center">
                  {col.header}
                  {renderSortIcon(col)}
                </span>
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-glass">
          {isLoading ? (
            // Skeleton rows — match the actual column count so the layout doesn't jump
            Array.from({ length: loadingRowCount }).map((_, rowIdx) => (
              <tr key={`skeleton-${rowIdx}`}>
                {columns.map((col, colIdx) => (
                  <td key={colIdx} className={cn(cellPad, alignClass(col.align))}>
                    <div
                      className={cn(
                        'h-3.5 animate-pulse rounded bg-glass-panel',
                        colIdx === 0 ? 'w-3/4' : colIdx === columns.length - 1 ? 'w-16 ml-auto' : 'w-4/5'
                      )}
                    />
                  </td>
                ))}
              </tr>
            ))
          ) : !data || data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-12">
                {emptyState ?? (
                  <div className="flex flex-col items-center justify-center text-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-glass-hover">
                      <EmptyIcon className="h-6 w-6 text-text-muted" />
                    </div>
                    <p className="text-sm text-text-muted">{emptyMessage}</p>
                  </div>
                )}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => {
              const key = getRowKey
                ? getRowKey(row, rowIndex)
                : (row._id || row.id || rowIndex)
              const interactive = !!onRowClick
              return (
                <tr
                  key={key}
                  onClick={() => interactive && onRowClick(row)}
                  onKeyDown={(e) => {
                    if (!interactive) return
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onRowClick(row)
                    }
                  }}
                  tabIndex={interactive ? 0 : undefined}
                  role={interactive ? 'button' : undefined}
                  className={cn(
                    'transition-colors',
                    zebra && rowIndex % 2 === 1 && 'bg-white/[0.03]',
                    interactive
                      ? 'cursor-pointer hover:bg-glass-hover focus:bg-glass-hover focus:outline-none focus:ring-2 focus:ring-cyan/30'
                      : 'hover:bg-glass-hover/50'
                  )}
                >
                  {columns.map((col, colIndex) => (
                    <td
                      key={colIndex}
                      className={cn(cellPad, alignClass(col.align), col.cellClassName)}
                    >
                      {col.render ? col.render(row, rowIndex) : row[col.key]}
                    </td>
                  ))}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
