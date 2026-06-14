/**
 * PayrollAccrualModal — record a month's employer EOBI/SESSI obligation
 * (FR-04.1, Phase 3/4). Minimal by design: month + the two amounts.
 */
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Modal from '@/components/modals/Modal'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { useSavePayrollAccrual } from '@/hooks/useTax'

const schema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use YYYY-MM'),
  eobi:  z.coerce.number().min(0, 'Must be ≥ 0'),
  sessi: z.coerce.number().min(0, 'Must be ≥ 0'),
}).refine(d => d.eobi > 0 || d.sessi > 0, { message: 'Enter at least one amount', path: ['eobi'] })

const currentMonth = () => new Date().toISOString().slice(0, 7)

export default function PayrollAccrualModal({ isOpen, onClose, focus = 'EOBI' }) {
  const save = useSavePayrollAccrual()
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { month: currentMonth(), eobi: 0, sessi: 0 },
  })

  useEffect(() => { if (isOpen) reset({ month: currentMonth(), eobi: 0, sessi: 0 }) }, [isOpen, reset])

  const onSubmit = async (data) => {
    try {
      await save.mutateAsync(data)
      onClose()
    } catch { /* toast handled in hook */ }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record payroll obligation" className="sm:max-w-md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 py-4">
        <p className="text-[13px] text-text-secondary -mt-2">
          Enter this month's employer social-security contributions. They appear in
          your live tax position as {focus === 'SESSI' ? 'SESSI' : 'EOBI'} obligations.
        </p>

        <Input label="Month" type="month" error={errors.month?.message} {...register('month')} />

        <div className="grid grid-cols-2 gap-4">
          <Input label="EOBI (employer)" type="number" step="0.01" placeholder="0"
            error={errors.eobi?.message} {...register('eobi')} />
          <Input label="SESSI / PESSI" type="number" step="0.01" placeholder="0"
            error={errors.sessi?.message} {...register('sessi')} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={save.isPending}>Cancel</Button>
          <Button type="submit" loading={save.isPending}>Save accrual</Button>
        </div>
      </form>
    </Modal>
  )
}
