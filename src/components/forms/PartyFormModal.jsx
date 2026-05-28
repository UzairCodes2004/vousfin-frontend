import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Modal from '@/components/modals/Modal'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { useCreateCustomer, useCreateVendor } from '@/hooks/useParties'

const partySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  taxId: z.string().optional(),
})

export default function PartyFormModal({ isOpen, onClose, type = 'customer', onCreated }) {
  const createCustomer = useCreateCustomer()
  const createVendor = useCreateVendor()

  const isCustomer = type === 'customer'
  const title = isCustomer ? 'Add New Customer' : 'Add New Vendor'
  const isPending = isCustomer ? createCustomer.isPending : createVendor.isPending

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(partySchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      taxId: '',
    },
  })

  useEffect(() => {
    if (isOpen) {
      reset()
    }
  }, [isOpen, reset])

  const onSubmit = async (formData) => {
    try {
      const { name, email, phone, address, taxId } = formData
      const created = isCustomer
        ? await createCustomer.mutateAsync({ fullName: name, email, phone, address, taxId })
        : await createVendor.mutateAsync({ vendorName: name, email, phone, address, taxId })
      // Pass the newly-created party back to the caller so it can pre-select it
      if (onCreated && created?._id) onCreated(created)
      onClose()
    } catch {
      // toast handled in hook
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} className="sm:max-w-md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 py-4">
        
        <Input
          label="Name"
          placeholder={`e.g., ${isCustomer ? 'Acme Corp' : 'Office Supplies Inc'}`}
          error={errors.name?.message}
          {...register('name')}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Email (Optional)"
            type="email"
            placeholder="contact@company.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Phone (Optional)"
            placeholder="+1 555-0123"
            error={errors.phone?.message}
            {...register('phone')}
          />
        </div>

        <Input
          label="Address (Optional)"
          placeholder="123 Business Rd"
          error={errors.address?.message}
          {...register('address')}
        />

        <Input
          label="Tax ID / VAT (Optional)"
          placeholder="e.g., TAX-12345"
          error={errors.taxId?.message}
          {...register('taxId')}
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={isPending}>
            Save {isCustomer ? 'Customer' : 'Vendor'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
