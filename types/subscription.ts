export type SubscriptionPeriod = 'monthly' | 'quarterly' | 'yearly'

export interface Subscription {
  id: string
  name: string
  amount: number
  period: SubscriptionPeriod
  first_due_date: string
  next_due_date: string
  reminded: boolean
  created_at: string
  updated_at: string
}

export interface SubscriptionInput {
  name: string
  amount: number
  period: SubscriptionPeriod
  first_due_date: string
}

export const PERIOD_DAYS: Record<SubscriptionPeriod, number> = {
  monthly: 30,
  quarterly: 90,
  yearly: 365,
}

export const PERIOD_LABELS: Record<SubscriptionPeriod, string> = {
  monthly: '月付',
  quarterly: '季付',
  yearly: '年付',
}
