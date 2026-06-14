-- 订阅提醒表
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  period VARCHAR(20) NOT NULL CHECK (period IN ('monthly', 'quarterly', 'yearly')),
  first_due_date DATE NOT NULL,
  next_due_date DATE NOT NULL,
  reminded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_due_date ON subscriptions(next_due_date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_reminded ON subscriptions(reminded);

-- 更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 行级安全策略 (RLS)
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- 允许匿名读取 (生产环境建议添加认证)
CREATE POLICY "允许公开读取" ON subscriptions
  FOR SELECT USING (true);

-- 允许匿名插入
CREATE POLICY "允许公开插入" ON subscriptions
  FOR INSERT WITH CHECK (true);

-- 允许匿名更新
CREATE POLICY "允许公开更新" ON subscriptions
  FOR UPDATE USING (true);

-- 允许匿名删除
CREATE POLICY "允许公开删除" ON subscriptions
  FOR DELETE USING (true);
