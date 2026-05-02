-- =============================================
-- Instagram Autoposter - Supabase スキーマ
-- =============================================
-- Supabase ダッシュボード > SQL Editor で実行してください

-- 投稿履歴テーブル
CREATE TABLE IF NOT EXISTS posts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url   TEXT NOT NULL,
  file_path   TEXT,
  caption     TEXT NOT NULL,
  hashtags    TEXT[] NOT NULL,
  instagram_post_id TEXT,
  permalink   TEXT,
  status      TEXT NOT NULL DEFAULT 'published',
  posted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 最新順インデックス
CREATE INDEX IF NOT EXISTS idx_posts_posted_at ON posts (posted_at DESC);

-- RLS（Row Level Security）を有効化
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Service Role キーからのアクセスのみ許可（APIルートから使う）
CREATE POLICY "service_role_all" ON posts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- トークンテーブル
CREATE TABLE IF NOT EXISTS tokens (
  id          SERIAL PRIMARY KEY,
  service     TEXT NOT NULL UNIQUE,
  token       TEXT NOT NULL,
  expires_at  TIMESTAMPTZ,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for tokens
ALTER TABLE tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_tokens" ON tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================
-- Storage バケット設定
-- =============================================
-- Supabase ダッシュボード > Storage > New bucket で
-- 以下の設定で作成してください：
--   バケット名: instagram-images
--   Public: ON（チェックを入れる）
--
-- または以下のSQLを実行（権限がある場合）:

INSERT INTO storage.buckets (id, name, public)
VALUES ('instagram-images', 'instagram-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage ポリシー: Service Role は全操作OK
CREATE POLICY "service_role_storage" ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'instagram-images')
  WITH CHECK (bucket_id = 'instagram-images');

-- Public 読み取りを許可（投稿画像を Instagram API が読めるようにする）
CREATE POLICY "public_read" ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'instagram-images');
