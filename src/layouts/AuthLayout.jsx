import { Outlet } from 'react-router-dom'
import { Link } from 'react-router-dom'
import vousFinLogo from '@/assets/vousfin-logo.png'

/*
 * AuthLayout — "Nocturne Ledger" first impression.
 * Left: the vault-at-midnight brand panel (aurora field, serif headline,
 * gold foil). Right: the form, floating on the canvas atmosphere.
 */
export default function AuthLayout() {
  return (
    <div className="flex min-h-screen bg-navy text-text-primary">
      {/* Left side — brand panel */}
      <div className="relative hidden lg:flex w-1/2 flex-col justify-between overflow-hidden border-r border-glass p-12 bg-charcoal">
        {/* Aurora field local to the panel */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(640px 460px at 18% -6%, rgb(var(--c-accent) / 0.14), transparent 60%),' +
              'radial-gradient(520px 380px at 92% 8%, rgb(var(--c-highlight) / 0.08), transparent 55%),' +
              'radial-gradient(900px 640px at 50% 118%, rgb(var(--c-accent2) / 0.20), transparent 65%)',
          }}
        />
        {/* Ledger rules — faint horizontal hairlines */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: 'linear-gradient(rgb(var(--c-text) / 0.045) 1px, transparent 1px)',
            backgroundSize: '100% 56px',
            maskImage: 'linear-gradient(180deg, transparent 8%, black 38%, black 78%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(180deg, transparent 8%, black 38%, black 78%, transparent 100%)',
          }}
        />

        <div className="relative">
          <Link to="/" className="flex items-center gap-3">
            <img src={vousFinLogo} alt="VousFin" className="h-10 w-10 object-contain drop-shadow-[0_0_10px_rgb(var(--c-accent)/0.35)]" />
            <span className="font-display text-2xl font-semibold tracking-tight text-text-primary">
              vous<span className="text-gradient">Fin</span>
            </span>
          </Link>
        </div>

        <div className="relative max-w-md">
          <p className="mb-5 flex items-center gap-2.5 text-[12.5px] font-semibold uppercase tracking-[0.22em] text-gold/90">
            <span className="h-px w-7 bg-gold/50" aria-hidden="true" />
            The midnight ledger
          </p>
          <h2 className="font-display text-[2.75rem] leading-[1.12] tracking-tight text-text-primary mb-5">
            Your books, kept
            <br />
            <em className="text-gradient not-italic font-display italic">beautifully</em> — by AI.
          </h2>
          <p className="text-lg text-text-secondary leading-relaxed">
            Type what happened in plain words. VousFin posts the double-entry
            journals, balances the accounts, and watches the numbers while you sleep.
          </p>

          <ul className="mt-8 space-y-3 text-[15px] text-text-secondary">
            {['Double-entry, done for you', 'Live statements & forecasts', 'Anomalies caught before they cost you'].map((line) => (
              <li key={line} className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_rgb(var(--c-accent)/0.8)]" aria-hidden="true" />
                {line}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center gap-4 text-sm text-text-muted font-medium">
          <span className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-60"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent shadow-[0_0_8px_rgb(var(--c-accent)/0.9)]"></span>
            </span>
            System online
          </span>
          <span className="text-text-muted/50">•</span>
          <span>Bank-grade security</span>
        </div>
      </div>

      {/* Right side — form */}
      <div className="relative flex w-full flex-col justify-center overflow-hidden px-4 py-12 sm:px-6 lg:w-1/2 lg:px-20 xl:px-32">
        {/* Mobile logo — shown only when left panel is hidden */}
        <div className="lg:hidden flex justify-center mb-8 relative z-10">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={vousFinLogo} alt="VousFin" className="h-9 w-9 object-contain drop-shadow-[0_0_10px_rgb(var(--c-accent)/0.35)]" />
            <span className="font-display text-2xl font-semibold tracking-tight text-text-primary">
              vous<span className="text-gradient">Fin</span>
            </span>
          </Link>
        </div>

        <div className="mx-auto w-full max-w-sm relative z-10">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
