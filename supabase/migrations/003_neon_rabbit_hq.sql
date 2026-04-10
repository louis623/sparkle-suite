-- ─── Neon Rabbit HQ — Phase 2A Schema ───────────────────────────────────────
-- Run against: neon-rabbit-core (bqhzfkgkjyuhlsozpylf)
-- DO NOT touch existing tables: open_brain, pgmq/embedding infrastructure

-- ─── projects ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id           text PRIMARY KEY,
  name         text NOT NULL,
  tier         smallint NOT NULL CHECK (tier IN (1,2,3,4)),
  status       text NOT NULL,
  scope        text,
  tool         text,
  next_action  text,
  category     text,
  updated_at   timestamptz DEFAULT now(),
  history      jsonb,
  clients      jsonb,
  milestones   jsonb,
  user_id      uuid NOT NULL REFERENCES auth.users(id)
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner access only" ON projects;
CREATE POLICY "Owner access only" ON projects
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── financial_snapshots ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS financial_snapshots (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date        date NOT NULL UNIQUE,
  mrr                  numeric,
  total_revenue        numeric,
  expenses             numeric,
  net                  numeric,
  personal_balance     numeric,
  business_balance     numeric,
  stripe_available     numeric,
  stripe_pending       numeric,
  runway_months        numeric,
  revenue              jsonb,
  personal_obligations jsonb,
  user_id              uuid NOT NULL REFERENCES auth.users(id),
  created_at           timestamptz DEFAULT now()
);

ALTER TABLE financial_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner access only" ON financial_snapshots;
CREATE POLICY "Owner access only" ON financial_snapshots
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── expenses ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  amount        numeric NOT NULL,
  category      text,
  billing_cycle text,
  active        boolean DEFAULT true,
  user_id       uuid NOT NULL REFERENCES auth.users(id),
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner access only" ON expenses;
CREATE POLICY "Owner access only" ON expenses
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── clients ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  site_name   text,
  site_url    text,
  status      text NOT NULL,
  tier        text,
  mrr         numeric,
  started_at  date,
  launched_at date,
  notes       text,
  user_id     uuid NOT NULL REFERENCES auth.users(id),
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner access only" ON clients;
CREATE POLICY "Owner access only" ON clients
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── queue_items ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS queue_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL,
  description  text,
  priority     smallint DEFAULT 3,
  status       text DEFAULT 'open',
  category     text,
  due_date     date,
  completed_at timestamptz,
  user_id      uuid NOT NULL REFERENCES auth.users(id),
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE queue_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner access only" ON queue_items;
CREATE POLICY "Owner access only" ON queue_items
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── ideas ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ideas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  description text,
  category    text,
  status      text DEFAULT 'captured',
  user_id     uuid NOT NULL REFERENCES auth.users(id),
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner access only" ON ideas;
CREATE POLICY "Owner access only" ON ideas
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── maintenance_items ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS maintenance_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  category     text,
  status       text DEFAULT 'ok',
  next_due     date,
  last_checked date,
  notes        text,
  user_id      uuid NOT NULL REFERENCES auth.users(id),
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE maintenance_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner access only" ON maintenance_items;
CREATE POLICY "Owner access only" ON maintenance_items
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── pa_items ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pa_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  category    text,
  status      text DEFAULT 'active',
  details     jsonb,
  next_action text,
  next_date   date,
  user_id     uuid NOT NULL REFERENCES auth.users(id),
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE pa_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner access only" ON pa_items;
CREATE POLICY "Owner access only" ON pa_items
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
