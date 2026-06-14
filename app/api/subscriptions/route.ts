import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { SubscriptionInput, PERIOD_DAYS } from '@/types/subscription'

// GET - 获取所有订阅
export async function GET() {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .order('next_due_date', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// POST - 新增订阅
export async function POST(request: NextRequest) {
  try {
    const body: SubscriptionInput = await request.json()
    const { name, amount, period, first_due_date } = body

    if (!name || !amount || !period || !first_due_date) {
      return NextResponse.json({ error: '缺少必要字段' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        name,
        amount,
        period,
        first_due_date,
        next_due_date: first_due_date,
        reminded: false,
      })
      .select()
      .single()

    if (error) {
      console.log('Supabase 错误详情:', JSON.stringify(error, null, 2))
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    console.error('POST /api/subscriptions 错误:', e)
    const message = e instanceof Error ? e.message : '请求解析失败'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PUT - 更新订阅
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: '缺少订阅 ID' }, { status: 400 })
    }

    // 如果更新了首次扣费日，重置下次扣费日
    if (updates.first_due_date) {
      updates.next_due_date = updates.first_due_date
      updates.reminded = false
    }

    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (e) {
    console.error('PUT /api/subscriptions 错误:', e)
    const message = e instanceof Error ? e.message : '请求解析失败'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE - 删除订阅
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: '缺少订阅 ID' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('subscriptions')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
