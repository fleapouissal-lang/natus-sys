-- Historique conversation bot WhatsApp (contexte Gemini)

ALTER TABLE whatsapp_bot_sessions
  ADD COLUMN IF NOT EXISTS history JSONB NOT NULL DEFAULT '[]';

NOTIFY pgrst, 'reload schema';
