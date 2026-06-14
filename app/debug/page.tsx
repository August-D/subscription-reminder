'use client'

import { useEffect, useState } from 'react'

export default function DebugPage() {
  const [env, setEnv] = useState<any>({})
  const [subscriptions, setSubscriptions] = useState<any[]>([])

  useEffect(() => {
    // 检查环境变量
    setEnv({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'set' : 'not set'
    })

    // 测试 API
    fetch('/api/subscriptions')
      .then(res => res.json())
      .then(data => {
        console.log('API Response:', data)
        setSubscriptions(data)
      })
      .catch(err => {
        console.error('API Error:', err)
      })
  }, [])

  return (
    <div>
      <h1>Debug Page</h1>
      <h2>Environment Variables</h2>
      <pre>{JSON.stringify(env, null, 2)}</pre>

      <h2>Subscriptions</h2>
      <pre>{JSON.stringify(subscriptions, null, 2)}</pre>
    </div>
  )
}