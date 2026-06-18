-- Bot WhatsApp : notifications statut + sessions conversation

ALTER TABLE shopify_orders
  ADD COLUMN IF NOT EXISTS whatsapp_status_notifications JSONB NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS whatsapp_bot_sessions (
  phone TEXT PRIMARY KEY,
  state TEXT NOT NULL DEFAULT 'idle',
  last_order_id UUID REFERENCES shopify_orders(id) ON DELETE SET NULL,
  pending_problem TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_bot_sessions_updated
  ON whatsapp_bot_sessions(updated_at DESC);

NOTIFY pgrst, 'reload schema';
