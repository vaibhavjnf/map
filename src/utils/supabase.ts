import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/supabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY

export const supabase = createClient<Database>(supabaseUrl, supabaseKey)

export const Tables = {
  USERS: 'users',
  TRANSACTIONS: 'transactions',
  MESSAGES: 'messages',
  SESSIONS: 'sessions',
  OTP: 'otp_records'
} as const
