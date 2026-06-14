'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

type CsvRow = {
  date: string
  merchant: string
  amount: number
  note: string
  dateObj?: Date
}

type DetectedSubscription = {
  merchantName: string
  averageAmount: number
  period: 'monthly' | 'quarterly' | 'yearly'
  lastTransactionDate: string
  intervalDays?: number
  confidence: 'high' | 'medium' | 'low'
}

export default function ImportPage() {
  const [csvData, setCsvData] = useState<CsvRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [检测结果, set检测结果] = useState<DetectedSubscription[]>([])
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleFileUpload = async (file: File) => {
    setIsLoading(true)
    try {
      const text = await file.text()
      const lines = text.trim().split('\n')
      const headers = lines[0].split(',').map(h => h.trim())

      // 验证 CSV 格式
      if (headers.length < 4 ||
          !headers.some(h => h.includes('交易时间') || h.includes('日期')) ||
          !headers.some(h => h.includes('商家名称') || h.includes('商家')) ||
          !headers.some(h => h.includes('金额'))) {
        throw new Error('CSV 格式不正确，请确保包含：交易时间,商家名称,金额,备注')
      }

      const data = lines.slice(1).filter(line => line.trim())
      const parsedData = data.map(line => {
        const values = line.split(',')
        return {
          date: values[0]?.trim(),
          merchant: values[1]?.trim(),
          amount: parseFloat(values[2]?.trim()) || 0,
          note: values[3]?.trim()
        }
      })

      setCsvData(parsedData)
      detectSubscriptions(parsedData)
    } catch (error) {
      alert('文件解析失败：' + (error as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  const detectSubscriptions = (data: CsvRow[]) => {
    // 按商家名称分组
    const merchantGroups = new Map()

    data.forEach((item: CsvRow) => {
      if (!item.date || !item.merchant) return

      const dateObj = new Date(item.date)
      if (isNaN(dateObj.getTime())) return

      if (!merchantGroups.has(item.merchant)) {
        merchantGroups.set(item.merchant, [])
      }
      merchantGroups.get(item.merchant).push({
        date: item.date,
        amount: item.amount,
        dateObj: dateObj
      })
    })

    const results: DetectedSubscription[] = []

    merchantGroups.forEach((transactions: Array<{date: string, amount: number, dateObj: Date}>, merchantName: string) => {
      if (transactions.length < 2) return // 至少需要2条记录

      // 按日期排序
      transactions.sort((a: {dateObj: Date}, b: {dateObj: Date}) => a.dateObj.getTime() - b.dateObj.getTime())

      // 检查金额一致性
      const amounts = transactions.map((t: {amount: number}) => t.amount)
      const avgAmount = amounts.reduce((sum, a) => sum + a, 0) / amounts.length
      const amountVariance = Math.max(...amounts) - Math.min(...amounts)
      const amountMatch = amountVariance / avgAmount < 0.05 // 金额相差 <5%

      if (!amountMatch) return

      // 计算时间间隔
      const intervals: number[] = []
      for (let i = 1; i < transactions.length; i++) {
        const diff = transactions[i].dateObj.getTime() - transactions[i-1].dateObj.getTime()
        intervals.push(Math.floor(diff / (1000 * 60 * 60 * 24))) // 转换为天数
      }

      // 计算平均间隔
      const avgInterval = intervals.reduce((sum, i) => sum + i, 0) / intervals.length

      // 判断周期
      let period: 'monthly' | 'quarterly' | 'yearly' | null = null
      let confidence: 'high' | 'medium' | 'low' = 'low'

      if (avgInterval >= 26 && avgInterval <= 34) {
        period = 'monthly'
        confidence = intervals.every(i => i >= 26 && i <= 34) ? 'high' : 'medium'
      } else if (avgInterval >= 85 && avgInterval <= 95) {
        period = 'quarterly'
        confidence = intervals.every(i => i >= 85 && i <= 95) ? 'high' : 'medium'
      } else if (avgInterval >= 350 && avgInterval <= 380) {
        period = 'yearly'
        confidence = intervals.every(i => i >= 350 && i <= 380) ? 'high' : 'medium'
      }

      if (period) {
        results.push({
          merchantName,
          averageAmount: avgAmount,
          period,
          lastTransactionDate: transactions[transactions.length - 1].date,
          intervalDays: avgInterval,
          confidence
        })
      }
    })

    set检测结果(results)
    // 默认选中所有
    setSelectedItems(new Set(results.map((r: DetectedSubscription) => r.merchantName)))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const files = e.dataTransfer.files
    if (files.length > 0 && files[0].type === 'text/csv') {
      handleFileUpload(files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  const toggleItem = (merchantName: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(merchantName)) {
      newSelected.delete(merchantName)
    } else {
      newSelected.add(merchantName)
    }
    setSelectedItems(newSelected)
  }

  const handleAddToSubscriptions = async () => {
    if (selectedItems.size === 0) {
      alert('请至少选择一个订阅')
      return
    }

    setIsLoading(true)
    try {
      const itemsToAdd =检测结果.filter((r: DetectedSubscription) => selectedItems.has(r.merchantName))

      for (const item of itemsToAdd) {
        // 计算下次扣费日期 = 最后一次扣费日期 + 一个周期
        const lastDate = new Date(item.lastTransactionDate)
        let nextDate: Date

        if (item.period === 'monthly') {
          nextDate = new Date(lastDate)
          nextDate.setMonth(nextDate.getMonth() + 1)
        } else if (item.period === 'quarterly') {
          nextDate = new Date(lastDate)
          nextDate.setMonth(nextDate.getMonth() + 3)
        } else {
          nextDate = new Date(lastDate)
          nextDate.setFullYear(nextDate.getFullYear() + 1)
        }

        await fetch('/api/subscriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: item.merchantName,
            amount: item.averageAmount,
            period: item.period,
            first_due_date: nextDate.toISOString().split('T')[0]
          })
        })
      }

      alert('成功添加 ' + itemsToAdd.length + ' 个订阅！')
      router.push('/')
    } catch (error) {
      alert('添加失败：' + (error as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  const downloadSampleCSV = () => {
    const sampleData = `交易时间,商家名称,金额,备注
2026-01-05,Netflix会员,45.00,自动续费
2026-01-08,星巴克,32.00,消费
2026-01-12,腾讯视频VIP,25.00,连续包月
2026-01-15,沃尔玛超市,128.50,消费
2026-01-18,某云存储服务,12.00,自动扣费
2026-02-05,Netflix会员,45.00,自动续费
2026-02-08,海底捞,156.00,消费
2026-02-12,腾讯视频VIP,25.00,连续包月
2026-02-16,某云存储服务,12.00,自动扣费
2026-02-22,亚马逊Prime会员,98.00,年度自动续费
2026-03-05,Netflix会员,45.00,自动续费
2026-03-12,腾讯视频VIP,25.00,连续包月
2026-03-17,某云存储服务,12.00,自动扣费
2026-04-05,Netflix会员,45.00,自动续费
2026-04-10,腾讯视频VIP,25.00,连续包月
2026-04-16,某云存储服务,12.00,自动扣费
2026-05-05,Netflix会员,45.00,自动续费
2026-05-12,腾讯视频VIP,25.00,连续包月
2026-05-17,某云存储服务,12.00,自动扣费`

    const blob = new Blob([sampleData], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'sample-bill.csv'
    link.click()
  }

  return (
    <div className="container">
      <header className="header">
        <h1>导入账单自动建档</h1>
        <p>上传你的消费记录，自动识别订阅服务</p>
      </header>

      <div className="import-section">
        <div
          className="upload-area"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".csv"
            className="hidden"
          />
          <div className="upload-content">
            <div className="upload-icon">📁</div>
            <p className="upload-text">点击选择或拖拽 CSV 文件到此处</p>
            <p className="upload-hint">支持格式：交易时间,商家名称,金额,备注</p>
          </div>
        </div>

        <div className="sample-section">
          <button
            className="btn btn-secondary"
            onClick={downloadSampleCSV}
          >
            📥 下载示例 CSV
          </button>
          <p className="sample-hint">点击下载示例文件，了解正确的 CSV 格式</p>
        </div>
      </div>

      {isLoading && (
        <div className="loading">
          <div className="loading-spinner">⏳</div>
          <p>正在分析账单...</p>
        </div>
      )}

      {检测结果.length > 0 && (
        <div className="detection-results">
          <h3>识别结果</h3>
          <p className="results-hint">
            共发现 {检测结果.length} 个疑似订阅，请确认后添加到你的订阅列表
          </p>

          <div className="results-list">
            {检测结果.map((item, index) => (
              <div key={index} className="result-item">
                <div className="result-checkbox">
                  <input
                    type="checkbox"
                    id={`item-${index}`}
                    checked={selectedItems.has(item.merchantName)}
                    onChange={() => toggleItem(item.merchantName)}
                  />
                  <label htmlFor={`item-${index}`} className="checkbox-label">
                    {selectedItems.has(item.merchantName) ? '✓' : '○'}
                  </label>
                </div>

                <div className="result-info">
                  <div className="merchant-name">{item.merchantName}</div>
                  <div className="result-meta">
                    <span>平均金额: ¥{item.averageAmount.toFixed(2)}</span>
                    <span>周期: {item.period === 'monthly' ? '月付' : item.period === 'quarterly' ? '季付' : '年付'}</span>
                    <span>最后扣费: {item.lastTransactionDate}</span>
                    {item.intervalDays && <span>平均间隔: {item.intervalDays} 天</span>}
                    <span className={`confidence ${item.confidence}`}>
                      {item.confidence === 'high' ? '高置信度' : item.confidence === 'medium' ? '中置信度' : '低置信度'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="actions">
            <button
              className="btn btn-primary"
              onClick={handleAddToSubscriptions}
              disabled={isLoading}
            >
              {isLoading ? '添加中...' : `添加到我的订阅 (${selectedItems.size})`}
            </button>
          </div>
        </div>
      )}

      {检测结果.length === 0 && csvData.length > 0 && !isLoading && (
        <div className="no-results">
          <div className="empty-icon">🤔</div>
          <p>没有识别出订阅服务</p>
          <p>请确保 CSV 文件包含规律性的消费记录</p>
        </div>
      )}
    </div>
  )
}