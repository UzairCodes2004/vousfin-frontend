import AppearanceCard from '@/components/settings/AppearanceCard'

/*
 * AppearancePage — dedicated home for theming, separate from Business Settings.
 * Route: /settings/appearance (Settings hub → Appearance).
 */
export default function AppearancePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Appearance</h1>
        <p className="text-text-secondary mt-1">Choose how VousFin looks. Your theme is saved on this device.</p>
      </div>

      <AppearanceCard />
    </div>
  )
}
