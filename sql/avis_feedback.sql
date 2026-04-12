-- Clics vers Google Avis (4-5 étoiles)
CREATE TABLE avis_google_clics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID REFERENCES reservations(id),
  commerce_id UUID REFERENCES commerces(id),
  user_id UUID REFERENCES users(id),
  note INTEGER NOT NULL CHECK (note >= 4 AND note <= 5),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE avis_google_clics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insert_authenticated" ON avis_google_clics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "select_admin" ON avis_google_clics FOR SELECT USING (auth.jwt()->>'email' = 'bonmomentapp@gmail.com');
CREATE POLICY "select_owner" ON avis_google_clics FOR SELECT USING (
  commerce_id IN (SELECT id FROM commerces WHERE owner_id = auth.uid())
);

-- Feedbacks privés (1-2-3 étoiles)
CREATE TABLE feedbacks_commerce (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID REFERENCES reservations(id),
  commerce_id UUID REFERENCES commerces(id),
  user_id UUID REFERENCES users(id),
  note INTEGER NOT NULL CHECK (note >= 1 AND note <= 3),
  commentaire TEXT,
  lu BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE feedbacks_commerce ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insert_authenticated" ON feedbacks_commerce FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "select_admin" ON feedbacks_commerce FOR SELECT USING (auth.jwt()->>'email' = 'bonmomentapp@gmail.com');
CREATE POLICY "select_owner" ON feedbacks_commerce FOR SELECT USING (
  commerce_id IN (SELECT id FROM commerces WHERE owner_id = auth.uid())
);
CREATE POLICY "update_owner" ON feedbacks_commerce FOR UPDATE USING (
  commerce_id IN (SELECT id FROM commerces WHERE owner_id = auth.uid())
);
