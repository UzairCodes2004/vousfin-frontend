import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import customerService from '@/services/customer.service'
import vendorService from '@/services/vendor.service'
import transactionService from '@/services/transaction.service'
import { getErrorMessage } from '@/utils/errorHandler'

/* ──────────────────────────────────────────────────────────────────────────
 * CUSTOMERS
 * ────────────────────────────────────────────────────────────────────────── */

export function useCustomers(params = { limit: 100 }) {
  return useQuery({
    queryKey: ['customers', params],
    queryFn: async () => {
      const { data } = await customerService.listCustomers(params)
      return data.data
    },
    staleTime: 2 * 60 * 1000,
  })
}

export function useCustomer(id) {
  return useQuery({
    queryKey: ['customer', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await customerService.getCustomerById(id)
      return data.data
    },
    staleTime: 2 * 60 * 1000,
  })
}

export function useCustomerBalance(id) {
  return useQuery({
    queryKey: ['customer-balance', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await customerService.getCustomerBalance(id)
      return data.data
    },
    staleTime: 30 * 1000,
  })
}

export function useCustomerTransactions(id, params = { limit: 50 }) {
  return useQuery({
    queryKey: ['customer-transactions', id, params],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await customerService.getCustomerTransactions(id, params)
      return data.data
    },
    staleTime: 60 * 1000,
  })
}

export function useCustomerStats(id) {
  return useQuery({
    queryKey: ['customer-stats', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await customerService.getCustomerStats(id)
      return data.data
    },
    staleTime: 60 * 1000,
  })
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (customerData) => {
      const { data } = await customerService.createCustomer(customerData)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      toast.success('Customer added successfully')
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...customerData }) => {
      const { data } = await customerService.updateCustomer(id, customerData)
      return data.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customer', variables.id] })
      toast.success('Customer updated')
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
}

export function useToggleCustomerActive() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await customerService.toggleActive(id)
      return data.data
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customer', id] })
      toast.success('Customer status updated')
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
}

/* ──────────────────────────────────────────────────────────────────────────
 * VENDORS
 * ────────────────────────────────────────────────────────────────────────── */

export function useVendors(params = { limit: 100 }) {
  return useQuery({
    queryKey: ['vendors', params],
    queryFn: async () => {
      const { data } = await vendorService.listVendors(params)
      return data.data
    },
    staleTime: 2 * 60 * 1000,
  })
}

export function useVendor(id) {
  return useQuery({
    queryKey: ['vendor', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await vendorService.getVendorById(id)
      return data.data
    },
    staleTime: 2 * 60 * 1000,
  })
}

export function useVendorBalance(id) {
  return useQuery({
    queryKey: ['vendor-balance', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await vendorService.getVendorBalance(id)
      return data.data
    },
    staleTime: 30 * 1000,
  })
}

export function useVendorTransactions(id, params = { limit: 50 }) {
  return useQuery({
    queryKey: ['vendor-transactions', id, params],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await vendorService.getVendorTransactions(id, params)
      return data.data
    },
    staleTime: 60 * 1000,
  })
}

export function useVendorStats(id) {
  return useQuery({
    queryKey: ['vendor-stats', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await vendorService.getVendorStats(id)
      return data.data
    },
    staleTime: 60 * 1000,
  })
}

export function useCreateVendor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (vendorData) => {
      const { data } = await vendorService.createVendor(vendorData)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      toast.success('Vendor added successfully')
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
}

export function useUpdateVendor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...vendorData }) => {
      const { data } = await vendorService.updateVendor(id, vendorData)
      return data.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      queryClient.invalidateQueries({ queryKey: ['vendor', variables.id] })
      toast.success('Vendor updated')
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
}

export function useToggleVendorActive() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await vendorService.toggleActive(id)
      return data.data
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      queryClient.invalidateQueries({ queryKey: ['vendor', id] })
      toast.success('Vendor status updated')
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
}

/* ──────────────────────────────────────────────────────────────────────────
 * OUTSTANDING AR / AP
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Get outstanding receivables (type='receivable') or payables (type='payable').
 *
 * When `withAging=true`, response is `{ rows: [...], aging: { current, '1-30', ... } }`.
 * Otherwise it's the raw array (for backward compat).
 */
export function useOutstandingBalances(type, opts = {}) {
  return useQuery({
    queryKey: ['outstanding', type, opts.withAging ? 'with-aging' : 'plain'],
    queryFn: async () => {
      const { data } = await transactionService.getOutstandingBalances(type, opts)
      return data.data
    },
    enabled: type === 'receivable' || type === 'payable',
    staleTime: 30 * 1000,
  })
}

/* ──────────────────────────────────────────────────────────────────────────
 * RECORD PAYMENT / SETTLEMENT
 * ────────────────────────────────────────────────────────────────────────── */

export function useRecordPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (paymentData) => {
      const { data } = await transactionService.recordPayment(paymentData)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outstanding'] })
      queryClient.invalidateQueries({ queryKey: ['customer-balance'] })
      queryClient.invalidateQueries({ queryKey: ['vendor-balance'] })
      queryClient.invalidateQueries({ queryKey: ['customer-transactions'] })
      queryClient.invalidateQueries({ queryKey: ['vendor-transactions'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      toast.success('Payment recorded')
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
}

/**
 * Trigger the AR/AP data-integrity repair on the backend.
 * Finds transactions where the account pair indicates AR/AP but the lifecycle
 * fields (paymentStatus, remainingBalance) were never set due to wrong type label.
 * Idempotent — safe to run multiple times.
 */
export function useRepairARAPTransactions() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data } = await transactionService.repairARAPTransactions()
      return data.data
    },
    onSuccess: (result) => {
      // Invalidate all AR/AP-dependent queries so the UI refreshes immediately
      queryClient.invalidateQueries({ queryKey: ['outstanding'] })
      queryClient.invalidateQueries({ queryKey: ['customer-balance'] })
      queryClient.invalidateQueries({ queryKey: ['customer-stats'] })
      queryClient.invalidateQueries({ queryKey: ['customer-transactions'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      const fixed = (result?.arFixed || 0) + (result?.apFixed || 0)
      if (fixed === 0) {
        toast.success('Books are consistent — no repairs needed.')
      } else {
        toast.success(`Fixed ${result.arFixed} receivable${result.arFixed !== 1 ? 's' : ''} and ${result.apFixed} payable${result.apFixed !== 1 ? 's' : ''}.`)
      }
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
}

/**
 * Mark AR entries as OVERDUE where dueDate < today.
 * Idempotent — safe to run multiple times.
 */
export function useRefreshOverdueAR() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data } = await transactionService.refreshOverdueAR()
      return data.data
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['outstanding'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      const updated = result?.updated || 0
      if (updated === 0) toast.success('No new overdue receivables found.')
      else toast.success(`${updated} receivable${updated !== 1 ? 's' : ''} marked as overdue.`)
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
}

/**
 * Fetch a customer's chronological statement (ledger with running balance).
 */
export function useCustomerStatement(id, params = {}) {
  return useQuery({
    queryKey: ['customer-statement', id, params],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await customerService.getCustomerStatement(id, params)
      return data.data
    },
    staleTime: 60 * 1000,
  })
}

/**
 * Mark AP entries as OVERDUE where dueDate < today.
 */
export function useRefreshOverdueAP() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data } = await transactionService.refreshOverdueAP()
      return data.data
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['outstanding'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      const updated = result?.updated || 0
      if (updated === 0) toast.success('No new overdue payables found.')
      else toast.success(`${updated} payable${updated !== 1 ? 's' : ''} marked as overdue.`)
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
}

/**
 * Fetch a vendor's chronological statement (AP ledger with running balance).
 */
export function useVendorStatement(id, params = {}) {
  return useQuery({
    queryKey: ['vendor-statement', id, params],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await vendorService.getVendorStatement(id, params)
      return data.data
    },
    staleTime: 60 * 1000,
  })
}
