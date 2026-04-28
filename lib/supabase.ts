import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// クライアント用（フロントエンド）
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// サーバー用（APIルート）- Service Role キーで権限強め
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
