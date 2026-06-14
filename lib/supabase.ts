import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// 客户端使用的 Supabase 客户端
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 服务端使用的 Supabase 客户端（有更高权限）
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
