import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '订阅提醒 - 管理你的自动扣费',
  description: '追踪订阅扣费，及时提醒，避免遗忘',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
