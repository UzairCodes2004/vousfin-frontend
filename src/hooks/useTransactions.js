import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '@/services/api'

const INFINITE_PAGE_SIZE = 50

function parseTransactionPage(data, pageParam) {
  const inner = data.data || {}
  return {
    docs:  Array.isArray(inner.data) ? inner.data : Array.isArray(inner) ? inner : [],
    total: inner.total ?? 0,
    page:  inner.page  ?? pageParam,
    limit: inner.limit ?? INFINITE_PAGE_SIZE,
  }
}

/**
 * Infinite-scroll version — appends pages as the user scrolls.
 * Keyed under ['transactions', ...] so existing mutation invalidations hit it.
 */
export function useInfiniteTransactions(filters = {}) {
  return useInfiniteQuery({
    queryKey: ['transactions', 'infinite', filters],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') params.append(key, String(val))
      })
      params.set('page', pageParam)
      params.set('limit', INFINITE_PAGE_SIZE)
      const { data } = await api.get(`/transactions?${params.toString()}`)
      return parseTransactionPage(data, pageParam)
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const fetched = lastPage.page * lastPage.limit
      return fetched < lastPage.total ? lastPage.page + 1 : undefined
    },
    staleTime: 60 * 1000,
  })
}

export function useTransactions(filters = {}) {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, val]) => {
        if (val) params.append(key, val)
      })
      const { data } = await api.get(`/transactions?${params.toString()}`)
      return parseTransactionPage(data, 1)
    },
    staleTime: 60 * 1000,
  })
}

export function useCreateTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (transactionData) => {
      const { data } = await api.post('/transactions/form', transactionData)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Transaction recorded successfully')
    },
    onError: (error) => {
      const resp = error.response?.data
      // Show detailed validation errors when available (helps debug Joi failures)
      const msg = resp?.errors || resp?.message || 'Failed to record transaction'
      toast.error(msg)
    },
  })
}

export function useCreateInstallmentTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (transactionData) => {
      const { data } = await api.post('/transactions/installment', transactionData)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Installment plan created successfully')
    },
    onError: (error) => {
      const resp = error.response?.data
      // Show the specific field that failed (e.g. '"downPayment" must be a number')
      const msg = resp?.errors || resp?.message || 'Failed to create installment plan'
      toast.error(msg)
    },
  })
}

export function useNLPreview() {
  return useMutation({
    mutationFn: async (text) => {
      const { data } = await api.post('/transactions/nl', { text })
      return data.data
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Could not parse transaction')
    },
  })
}

export function useNLConfirm() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (transactionData) => {
      const { data } = await api.post('/transactions/nl/confirm', transactionData)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Transaction recorded from natural language')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to confirm transaction')
    },
  })
}

export function useExcelPreview() {
  return useMutation({
    mutationFn: async (file) => {
      const form = new FormData()
      form.append('file', file)
      const { data } = await api.post('/transactions/excel', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return data.data
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to parse Excel file')
    },
  })
}

export function useExcelConfirm() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (rows) => {
      const { data } = await api.post('/transactions/excel/confirm', { rows })
      return data.data
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success(`${result?.successful ?? 'All'} transactions imported`)
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Import failed')
    },
  })
}

/**
 * Update only the transactionDate of an existing transaction.
 * Uses the existing PUT /transactions/:id endpoint — date-only patch
 * preserves amounts, accounts, and audit trail; invalidates report cache.
 */
export function useUpdateTransactionDate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, transactionDate }) => {
      const { data } = await api.put(`/transactions/${id}`, { transactionDate })
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['outstanding'] })
      toast.success('Transaction date updated')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update date')
    },
  })
}

/**
 * Phase 3.5 Step 5 — Pre-save accountant check.
 * Runs duplicate, tax, party, and unusual-amount warnings before saving.
 * Returns { warnings, suggestions, duplicateRisk } — never blocks the save.
 */
export function usePreSaveCheck() {
  return useMutation({
    mutationFn: async (txData) => {
      const { data } = await api.post('/ai/pre-save-check', txData)
      return data.data
    },
    // Silent on error — pre-save checks are advisory; network failure must not block save
    onError: () => {},
  })
}

/**
 * Reverse a posted transaction.
 * POST /transactions/:id/reverse
 */
export function useReverseTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, reversalDate, reason }) => {
      const { data } = await api.post(`/transactions/${id}/reverse`, { reversalDate, reason })
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Transaction reversed successfully')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to reverse transaction')
    },
  })
}

/**
 * Fetch audit history + reversal entry for a specific transaction.
 * GET /transactions/:id/history
 */
export function useTransactionHistory(transactionId, options = {}) {
  return useQuery({
    queryKey: ['transaction-history', transactionId],
    queryFn: async () => {
      const { data } = await api.get(`/transactions/${transactionId}/history`)
      return data.data
    },
    enabled: Boolean(transactionId),
    ...options,
  })
}
