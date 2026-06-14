import { NextResponse } from 'next/server'
import { Subscription } from '@/types/subscription'

interface CleanedBill {
  name: string
  amount: number
  cycle: string
}

// 输出格式示例：
// 订阅项目: 淘宝88vip, 金额: 88元, 扣费周期: yearly
// 订阅项目: 美图秀秀, 金额: 15元, 扣费周期: monthly

export async function POST(request: Request) {
  try {
    // 1. 拿到前端传过来的账单数据
    const { subscriptions } = await request.json()

    // 2. 严格的数据清洗逻辑
    const cleanedBills: CleanedBill[] = subscriptions.map((sub: Subscription) => ({
      name: sub.name?.trim() || '未命名订阅',
      amount: typeof sub.amount === 'number' ? sub.amount : parseFloat(sub.amount) || 0,
      cycle: sub.period || 'unknown'
    })).filter((bill: any): bill is CleanedBill =>
      bill.name &&
      typeof bill.amount === 'number' &&
      bill.amount > 0 &&
      bill.cycle
    )

    // 3. 把清洗后的数组对象转成 JSON 字符串，方便喂给 Dify 变量
    const billDataString = JSON.stringify(cleanedBills)

    console.log('原始订阅数量:', subscriptions.length)
    console.log('清洗后的账单数据:', cleanedBills)
    console.log('发送给 Dify 的 JSON:', billDataString)

    // 4. 拿着钥匙，向 Dify 发起统一的工作流调用
    // 更改后的代码：直接把 Dify 的 API 地址填进去
// 更改后的代码：把 API 地址和 你的 app- 密钥全部直接贴进去
const response = await fetch('https://api.dify.ai/v1/workflows/run', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    // ⚠️ 注意：Bearer 后面有一个空格！后面直接粘贴你的 Dify app- 钥匙
    'Authorization': 'Bearer app-PqYe6kJCC8NqY8G8d5uZtvJq'
  },
  body: JSON.stringify({
    response_mode: "blocking",
    user: "abc-123",
    inputs: {
      bill_data: billDataString
    }
  })
})

    if (!response.ok) {
      throw new Error(`Dify API error: ${response.status}`)
    }

    const difyResult = await response.json()

    // 5. 解析 Dify 返回的最终结果（也就是结束节点里的 report_json）
    // Dify 的 blocking 返回结构通常在 data.outputs 里面
    let rawOutput = difyResult.data?.outputs?.report_json || '{}'

    // 6. 清洗思考标签
    // 使用正则表达式移除 contentturn0step39search0<span class="think"><think>...</think></span>  标签及其内部内容
    rawOutput = rawOutput.replace(/contentturn0step39search0<span class="think"><think>[\s\S]*?<\/think><\/span> /g, '')

    // 使用正则表达式移除任何 <think>...</think> 标签及其内部内容
    rawOutput = rawOutput.replace(/<think>[\s\S]*?<\/think>/g, '')

    // 裁掉两边的空格和换行
    rawOutput = rawOutput.trim()

    // 移除其他可能的思考标签格式
    rawOutput = rawOutput.replace(/[\s\S]*?/g, '')

    // 确保输出是有效的 JSON 字符串
    console.log('清洗后的输出:', rawOutput)

    // 7. 把它转成标准的 JSON 对象传给前端
    const finalReport = JSON.parse(rawOutput)

    return NextResponse.json({ success: true, data: finalReport })

  } catch (error: any) {
    console.error('资本主义逆子罢工了:', error)
    return NextResponse.json(
      { success: false, error: error.message || '侦探在路上下暴雨耽误了' },
      { status: 500 }
    )
  }
}