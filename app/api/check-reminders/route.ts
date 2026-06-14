import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { SubscriptionPeriod } from '@/types/subscription'

const SERVERCHAN_SENDKEY = process.env.SERVERCHAN_SENDKEY

const PERIOD_DAYS: Record<SubscriptionPeriod, number> = {
  monthly: 30,
  quarterly: 90,
  yearly: 365,
}

const PERIOD_LABELS: Record<SubscriptionPeriod, string> = {
  monthly: '月付',
  quarterly: '季付',
  yearly: '年付',
}

interface Subscription {
  id: string
  name: string
  amount: number
  period: SubscriptionPeriod
  next_due_date: string
  reminded: boolean
}

// 推送到 Server酱
async function sendNotification(sub: Subscription): Promise<boolean> {
  if (!SERVERCHAN_SENDKEY) {
    console.warn('SERVERCHAN_SENDKEY 未配置，跳过推送')
    return false
  }

  const title = '订阅提醒'
  const desp = `【${sub.name}】将在 ${sub.next_due_date} 扣费 ¥${sub.amount.toFixed(2)}，周期：${PERIOD_LABELS[sub.period]}。如不再需要请及时取消订阅。`

  try {
    const res = await fetch(`https://sctapi.ftqq.com/${SERVERCHAN_SENDKEY}.send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `title=${encodeURIComponent(title)}&desp=${encodeURIComponent(desp)}`,
    })
    const data = await res.json()
    console.log('Server酱推送结果:', data)
    return data.code === 0
  } catch (e) {
    console.error('Server酱推送失败:', e)
    return false
  }
}

// 计算新的 next_due_date
function calculateNewDueDate(currentDate: string, period: SubscriptionPeriod): string {
  const date = new Date(currentDate)
  const days = PERIOD_DAYS[period]
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}

export async function GET() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]

  const threeDaysLater = new Date(today)
  threeDaysLater.setDate(threeDaysLater.getDate() + 3)
  const threeDaysLaterStr = threeDaysLater.toISOString().split('T')[0]

  console.log(`检查范围: ${todayStr} ~ ${threeDaysLaterStr}`)

  // 1. 处理已过期的订阅（next_due_date < 今天）
  const { data: expiredSubs, error: expiredError } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .lt('next_due_date', todayStr)

  if (expiredError) {
    console.error('查询过期订阅失败:', expiredError)
    return NextResponse.json({ error: expiredError.message }, { status: 500 })
  }

  const resetResults: Array<{ id: string; name: string; oldDate: string; newDate: string }> = []

  for (const sub of expiredSubs || []) {
    const subscription = sub as Subscription
    let newDate = calculateNewDueDate(subscription.next_due_date, subscription.period)

    // 如果新日期还是过去，继续累加直到未来
    while (newDate < todayStr) {
      newDate = calculateNewDueDate(newDate, subscription.period)
    }

    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        next_due_date: newDate,
        reminded: false,
      })
      .eq('id', subscription.id)

    if (!updateError) {
      resetResults.push({
        id: subscription.id,
        name: subscription.name,
        oldDate: subscription.next_due_date,
        newDate,
      })
      console.log(`重置订阅: ${subscription.name} ${subscription.next_due_date} -> ${newDate}`)
    }
  }

  // 2. 查询需要提醒的订阅（3天内且未提醒）
  const { data: dueSubs, error: dueError } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .gte('next_due_date', todayStr)
    .lte('next_due_date', threeDaysLaterStr)
    .eq('reminded', false)

  if (dueError) {
    console.error('查询待提醒订阅失败:', dueError)
    return NextResponse.json({ error: dueError.message }, { status: 500 })
  }

  // 3. 发送提醒
  const notifyResults: Array<{ id: string; name: string; notified: boolean }> = []

  for (const sub of dueSubs || []) {
    const subscription = sub as Subscription
    const success = await sendNotification(subscription)

    if (success) {
      await supabaseAdmin
        .from('subscriptions')
        .update({ reminded: true })
        .eq('id', subscription.id)
    }

    notifyResults.push({
      id: subscription.id,
      name: subscription.name,
      notified: success,
    })
    console.log(`提醒订阅: ${subscription.name}, 推送${success ? '成功' : '失败'}`)
  }

  return NextResponse.json({
    success: true,
    summary: {
      resetCount: resetResults.length,
      notifiedCount: notifyResults.filter(r => r.notified).length,
    },
    reset: resetResults,
    notified: notifyResults,
  })
}
