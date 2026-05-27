import { Outlet } from 'react-router-dom'
import { Link } from 'react-router-dom'
import vousFinLogo from '@/assets/vousfin-logo.png'

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen bg-navy text-text-primary">
      {/* Left side - Dynamic branding/graphics */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between border-r border-glass p-12 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan/10 via-navy to-navy">
        <div>
          <Link to="/" className="flex items-center gap-3">
            <img src={vousFinLogo} alt="VousFin" className="h-10 w-10 object-contain drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]" />
            <span className="text-2xl font-black tracking-tight text-text-primary">
              vous<span className="text-gradient">Fin</span>
            </span>
          </Link>
        </div>
        
        <div className="max-w-md">
          <h2 className="text-4xl font-black leading-tight tracking-tight mb-4 text-text-primary">
            SME Accounting <br />
            <span className="text-gradient">Automated by AI</span>
          </h2>
          <p className="text-lg text-text-secondary leading-relaxed">
            Stop worrying about manual journals and spreadsheets. Just type what happened, and we handle the double-entry books.
          </p>
        </div>

        <div className="flex items-center gap-4 text-sm text-text-muted font-medium">
          <span className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-300"></span>
            </span>
            System Online
          </span>
          <span>•</span>
          <span>Bank-grade security</span>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex w-full flex-col justify-center px-4 py-12 sm:px-6 lg:w-1/2 lg:px-20 xl:px-32 bg-navy relative overflow-hidden">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

        {/* Mobile logo — shown only when left panel is hidden */}
        <div className="lg:hidden flex justify-center mb-8 relative z-10">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={vousFinLogo} alt="VousFin" className="h-9 w-9 object-contain drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]" />
            <span className="text-2xl font-black tracking-tight text-text-primary">
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
