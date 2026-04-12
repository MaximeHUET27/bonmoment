-- Table pour stocker les feedbacks du chatbot
CREATE TABLE IF NOT EXISTS chatbot_feedbacks (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id TEXT         NOT NULL,
  helpful    BOOLEAN      NOT NULL,
  user_role  TEXT         NOT NULL CHECK (user_role IN ('guest', 'habitant', 'commercant')),
  created_at TIMESTAMPTZ  DEFAULT now()
);

ALTER TABLE chatbot_feedbacks ENABLE ROW LEVEL SECURITY;

-- Seul l'admin peut lire/modifier
CREATE POLICY "admin_read" ON chatbot_feedbacks
  FOR SELECT USING (auth.jwt()->>'email' = 'bonmomentapp@gmail.com');

-- Tout le monde peut insérer (feedback anonyme ok)
CREATE POLICY "insert_all" ON chatbot_feedbacks
  FOR INSERT WITH CHECK (true);
