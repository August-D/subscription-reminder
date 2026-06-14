'use client'

import { useState, useEffect, useCallback } from 'react'
import { Subscription, SubscriptionInput, SubscriptionPeriod, PERIOD_LABELS } from '@/types/subscription'
import DetectiveSection from './DetectiveSection'

interface SubscriptionWithStatus extends Subscription {
  daysUntil?: number
  status?: 'normal' | 'due-soon' | 'overdue'
}

export default function HomePage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingSub, setEditingSub] = useState<Subscription | null>(null)
  const [formData, setFormData] = useState<{
    name: string
    amount: string
    period: SubscriptionPeriod
    first_due_date: string
  }>({
    name: '',
    amount: '',
    period: 'monthly',
    first_due_date: '',
  })

  const fetchSubscriptions = useCallback(async () => {
    try {
      const res = await fetch('/api/subscriptions')
      const data: Subscription[] = await res.json()

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const processed = data.map(sub => {
        const dueDate = new Date(sub.next_due_date)
        const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        let status: 'normal' | 'due-soon' | 'overdue' = 'normal'
        if (daysUntil < 0) status = 'overdue'
        else if (daysUntil <= 3) status = 'due-soon'

        return { ...sub, daysUntil, status }
      })

      setSubscriptions(processed)
    } catch (e) {
      console.error('获取订阅失败:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSubscriptions()
  }, [fetchSubscriptions])

  const openAddModal = () => {
    setEditingSub(null)
    setFormData({
      name: '',
      amount: '',
      period: 'monthly',
      first_due_date: new Date().toISOString().split('T')[0],
    })
    setModalOpen(true)
  }

  const openEditModal = (sub: Subscription) => {
    setEditingSub(sub)
    setFormData({
      name: sub.name,
      amount: sub.amount.toString(),
      period: sub.period,
      first_due_date: sub.first_due_date,
    })
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const payload = {
      ...formData,
      amount: parseFloat(formData.amount) || 0,
    }

    if (editingSub) {
      // 更新
      await fetch('/api/subscriptions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingSub.id, ...payload }),
      })
    } else {
      // 新增
      await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    }

    setModalOpen(false)
    fetchSubscriptions()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个订阅吗？')) return

    await fetch(`/api/subscriptions?id=${id}`, { method: 'DELETE' })
    fetchSubscriptions()
  }

  // 统计
  const monthlyTotal = subscriptions.reduce((sum, sub) => {
    if (sub.period === 'monthly') return sum + sub.amount
    if (sub.period === 'quarterly') return sum + sub.amount / 3
    return sum + sub.amount / 12
  }, 0)

  const dueSoonCount = subscriptions.filter(s => s.status === 'due-soon').length
  const overdueCount = subscriptions.filter(s => s.status === 'overdue').length

  if (loading) {
    return (
      <div className="container">
        <div className="empty-state">
          <div className="empty-icon">⏳</div>
          <p>加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <header className="header">
        <div className="header-content">
          <div>
            <h1>订阅提醒</h1>
            <p>追踪你的订阅扣费，避免遗忘</p>
          </div>
          <a href="/import" className="btn btn-secondary">
            📥 导入账单
          </a>
        </div>
      </header>

      <div className="stats">
        <div className="stat-card">
          <div className="stat-value">{subscriptions.length}</div>
          <div className="stat-label">订阅数量</div>
        </div>
        <div className="stat-card">
          <div className="stat-value warning">¥{monthlyTotal.toFixed(0)}</div>
          <div className="stat-label">月均支出</div>
        </div>
        {dueSoonCount > 0 && (
          <div className="stat-card">
            <div className="stat-value warning">{dueSoonCount}</div>
            <div className="stat-label">即将扣费</div>
          </div>
        )}
        {overdueCount > 0 && (
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--danger)' }}>{overdueCount}</div>
            <div className="stat-label">已过期</div>
          </div>
        )}
      </div>

      <DetectiveSection subscriptions={subscriptions} />

      <div style={{ marginBottom: 32 }}>
        <button className="btn btn-primary" onClick={openAddModal}>
          + 添加订阅
        </button>
      </div>

      {subscriptions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <p>暂无订阅记录</p>
          <p style={{ marginTop: 8, fontSize: 14 }}>点击上方按钮添加你的第一个订阅</p>
        </div>
      ) : (
        <div className="sub-list">
          {subscriptions.map(sub => (
            <div key={sub.id} className={`sub-card ${sub.status !== 'normal' ? sub.status : ''}`}>
              <div className="sub-info">
                <div className="sub-name">
                  {sub.name}
                  {sub.reminded && <span className="reminded-badge">已提醒</span>}
                </div>
                <div className="sub-meta">
                  <span>📅 {sub.next_due_date}</span>
                  <span>
                    {sub.daysUntil !== undefined && (
                      sub.daysUntil < 0
                        ? `已过期 ${Math.abs(sub.daysUntil)} 天`
                        : `${sub.daysUntil} 天后扣费`
                    )}
                  </span>
                  <span>🔄 {PERIOD_LABELS[sub.period]}</span>
                </div>
              </div>
              <div className="sub-amount">
                ¥{sub.amount.toFixed(2)}
                <span className="period">/{sub.period === 'monthly' ? '月' : sub.period === 'quarterly' ? '季' : '年'}</span>
              </div>
              <div className="sub-actions">
                <button className="btn btn-secondary btn-small" onClick={() => openEditModal(sub)}>
                  编辑
                </button>
                <button className="btn btn-danger btn-small" onClick={() => handleDelete(sub.id)}>
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingSub ? '编辑订阅' : '添加订阅'}</h2>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">订阅名称</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="如：Netflix、腾讯视频"
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">金额 (¥)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.amount}
                      onChange={e => setFormData({ ...formData, amount: e.target.value })}
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">周期</label>
                    <select
                      className="form-select"
                      value={formData.period}
                      onChange={e => setFormData({ ...formData, period: e.target.value as SubscriptionPeriod })}
                    >
                      <option value="monthly">月付</option>
                      <option value="quarterly">季付</option>
                      <option value="yearly">年付</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">首次扣费日期</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.first_due_date}
                    onChange={e => setFormData({ ...formData, first_due_date: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                  取消
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingSub ? '保存' : '添加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
