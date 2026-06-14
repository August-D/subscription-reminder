# 订阅提醒工具

一个基于 Next.js 15 + Supabase 的个人订阅管理工具，支持扣费提醒推送。

## 功能特性

- 📋 **订阅管理**：添加、编辑、删除订阅记录
- 🔔 **智能提醒**：3天内即将扣费的订阅自动推送通知（通过 Server酱）
- 🔄 **自动重置**：过期的订阅自动更新到下一周期
- 📊 **支出统计**：实时计算月均支出

## 技术栈

- **前端**：Next.js 15 (App Router) + TypeScript
- **数据库**：Supabase (PostgreSQL)
- **推送**：Server酱

## 快速开始

### 1. 安装依赖

```bash
cd subscription-reminder
npm install
```

### 2. 创建 Supabase 项目

1. 访问 [Supabase](https://supabase.com) 创建账号并新建项目
2. 进入项目后，点击 **SQL Editor**
3. 执行 `supabase/init.sql` 中的 SQL 创建数据表

### 3. 获取 API 密钥

在 Supabase 项目设置中找到：

- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`（注意保密！）

### 4. 获取 Server酱 SendKey

1. 访问 [Server酱](https://sct.ftqq.com/) 注册账号
2. 获取 SendKey

### 5. 配置环境变量

```bash
cp .env.local.example .env.local
```

编辑 `.env.local`：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SERVERCHAN_SENDKEY=your-sendkey
```

### 6. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## API 接口

### 订阅管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/subscriptions` | 获取所有订阅 |
| POST | `/api/subscriptions` | 新增订阅 |
| PUT | `/api/subscriptions` | 更新订阅 |
| DELETE | `/api/subscriptions?id=xxx` | 删除订阅 |

### 提醒检查

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/check-reminders` | 检查并发送提醒 |

## 定时任务配置

推荐使用 cron 或第三方定时服务每天调用提醒接口：

### 方式一：Vercel Cron Jobs

创建 `app/api/cron/route.ts`：

```typescript
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  // 验证 cron 密钥
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 调用提醒检查
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/check-reminders`)
  return NextResponse.json(await res.json())
}
```

在 `vercel.json` 中配置：

```json
{
  "crons": [{
    "path": "/api/cron",
    "schedule": "0 9 * * *"
  }]
}
```

### 方式二：外部定时服务

使用 [cron-job.org](https://cron-job.org) 等服务，每天定时请求：

```
GET https://your-domain.com/api/check-reminders
```

## 项目结构

```
subscription-reminder/
├── app/
│   ├── api/
│   │   ├── subscriptions/route.ts  # 订阅 CRUD
│   │   └── check-reminders/route.ts # 提醒检查
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                    # 主页面
├── lib/
│   └── supabase.ts                 # Supabase 客户端
├── types/
│   └── subscription.ts             # 类型定义
├── supabase/
│   └── init.sql                    # 数据库初始化脚本
├── .env.local.example
├── package.json
└── README.md
```

## 许可证

MIT
