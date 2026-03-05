export type TaskType = 'subscribe' | 'like' | 'watch_ad' | 'invite'
export type UserTaskStatus = 'in_progress' | 'checking' | 'completed' | 'failed' | 'expired'
export type WithdrawalStatus = 'created' | 'processing' | 'security_check' | 'paid' | 'rejected'
export type TransactionType = 'task_reward' | 'referral_bonus' | 'withdrawal' | 'withdrawal_fee' | 'adjustment' | 'penalty'

export interface User {
  id: number
  telegram_id: number
  first_name: string
  last_name: string | null
  username: string | null
  photo_url?: string | null
  balance: string
  balance_pending: string
  total_earned: string
  trust_score: number
  is_banned: boolean
  created_at: string
}

export interface Profile extends User {
  completed_today: number
  referrals_count: number
}

export interface Task {
  id: number
  title: string
  description: string
  instruction: string
  task_type: TaskType
  reward: string
  icon_url: string | null
  external_url: string | null
  channel_id: string | null
  duration_seconds: number | null
  max_completions: number | null
  total_completions: number | null
  is_vip: boolean
  user_status: UserTaskStatus | null
  user_task_id: number | null
  error_message?: string | null
  expires_at: string | null
}

export interface ReferralIncomeDay {
  date: string
  amount: number
}

export interface Referral {
  telegram_id: number
  first_name: string
  username: string | null
  is_active: boolean
  joined_at: string
  earned_from: string
}

export interface Bonuses {
  referral_link: string
  referrals_count: number
  total_from_referrals: string
  referrals: Referral[]
}

export interface Transaction {
  id: number
  amount: string
  tx_type: TransactionType
  description: string
  created_at: string
}

export type SortType = 'default' | 'reward_desc' | 'reward_asc' | 'newest'

export interface TaskListResponse {
  tasks: Task[]
  completed_today: number
  total: number
  page: number
  pages: number
}

export interface TransactionListResponse {
  items: Transaction[]
  total: number
  page: number
  pages: number
}

export interface Withdrawal {
  id: number
  amount: string
  fee: string
  method: string
  requisites: string
  status: WithdrawalStatus
  admin_note: string | null
  created_at: string
  processed_at: string | null
}
